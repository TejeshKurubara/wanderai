"""
Expense and budget tracking data operations (collection: expenses).
Guarantees ownership validation and precision mathematical budget analytics.
"""

from datetime import datetime, timezone
from models import get_db, to_object_id


def _expenses():
    return get_db()["expenses"]


def ensure_indexes():
    _expenses().create_index([("trip_id", 1), ("user_id", 1), ("date", -1)])


def serialize_expense(exp: dict) -> dict:
    created_at = exp.get("created_at")
    splits_raw = exp.get("splits", [])
    serialized_splits = []
    for s in splits_raw:
        serialized_splits.append({
            "user_id": str(s.get("user_id") or ""),
            "name": s.get("name", "Traveler"),
            "amount": round(float(s.get("amount", 0.0)), 2),
            "percentage": round(float(s.get("percentage", 0.0)), 2) if s.get("percentage") is not None else None,
            "settled": bool(s.get("settled", False)),
        })

    paid_by_name = exp.get("paid_by_name") or exp.get("paid_by") or "You"
    paid_by_user_id = str(exp.get("paid_by_user_id") or exp.get("user_id"))

    return {
        "id": str(exp["_id"]),
        "trip_id": str(exp["trip_id"]),
        "user_id": str(exp["user_id"]),
        "category": exp.get("category", "miscellaneous"),
        "amount": round(float(exp.get("amount", 0.0)), 2),
        "currency": exp.get("currency", "INR"),
        "date": exp.get("date"),
        "payment_status": exp.get("payment_status", "paid"),  # paid, pending, refunded, cancelled
        "description": exp.get("description", ""),
        "booking_reference": exp.get("booking_reference", ""),
        "paid_by": paid_by_name,
        "paid_by_name": paid_by_name,
        "paid_by_user_id": paid_by_user_id,
        "split_type": exp.get("split_type", "EQUAL").upper(),
        "splits": serialized_splits,
        "created_at": created_at.isoformat() if created_at else None,
    }


def create_expense(user_id: str, trip_id: str, data: dict) -> dict:
    owner, tid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or tid is None:
        raise ValueError("Invalid user_id or trip_id")

    amount = round(float(data.get("amount", 0.0)), 2)
    paid_by_name = (data.get("paid_by_name") or data.get("paid_by") or "You").strip()
    paid_by_user_id = str(data.get("paid_by_user_id") or owner)
    split_type = (data.get("split_type") or "EQUAL").upper().strip()
    splits_raw = data.get("splits") or []

    # Clean and validate splits
    splits = []
    for s in splits_raw:
        splits.append({
            "user_id": str(s.get("user_id") or ""),
            "name": str(s.get("name") or "Traveler").strip(),
            "amount": round(float(s.get("amount", 0.0)), 2),
            "percentage": float(s.get("percentage")) if s.get("percentage") is not None else None,
            "settled": bool(s.get("settled", False)),
        })

    doc = {
        "trip_id": tid,
        "user_id": owner,
        "category": (data.get("category") or "miscellaneous").lower().strip(),
        "amount": amount,
        "currency": (data.get("currency") or "INR").upper().strip(),
        "date": data.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "payment_status": (data.get("payment_status") or "paid").lower().strip(),
        "description": (data.get("description") or "").strip(),
        "booking_reference": (data.get("booking_reference") or "").strip(),
        "paid_by": paid_by_name,
        "paid_by_name": paid_by_name,
        "paid_by_user_id": paid_by_user_id,
        "split_type": split_type,
        "splits": splits,
        "created_at": datetime.now(timezone.utc),
    }
    result = _expenses().insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_expense(doc)


def get_expenses_by_trip(user_id: str, trip_id: str) -> list:
    owner, tid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or tid is None:
        return []
    # All members of the trip can view trip expenses
    cursor = _expenses().find({"trip_id": tid}).sort("date", -1)
    return [serialize_expense(e) for e in cursor]


def get_expense_by_id(user_id: str, expense_id: str):
    owner, eid = to_object_id(user_id), to_object_id(expense_id)
    if owner is None or eid is None:
        return None
    doc = _expenses().find_one({"_id": eid, "user_id": owner})
    return serialize_expense(doc) if doc else None


def update_expense(user_id: str, expense_id: str, data: dict):
    owner, eid = to_object_id(user_id), to_object_id(expense_id)
    if owner is None or eid is None:
        return None

    allowed = {"category", "amount", "currency", "date", "payment_status", "description", "booking_reference"}
    updates = {}
    for k in allowed:
        if k in data:
            if k == "amount":
                updates[k] = round(float(data[k]), 2)
            elif k in ("category", "payment_status"):
                updates[k] = str(data[k]).lower().strip()
            elif k == "currency":
                updates[k] = str(data[k]).upper().strip()
            else:
                updates[k] = str(data[k]).strip()

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        _expenses().update_one({"_id": eid, "user_id": owner}, {"$set": updates})

    return get_expense_by_id(user_id, expense_id)


def delete_expense(user_id: str, expense_id: str) -> bool:
    owner, eid = to_object_id(user_id), to_object_id(expense_id)
    if owner is None or eid is None:
        return False
    return _expenses().delete_one({"_id": eid, "user_id": owner}).deleted_count == 1


def compute_budget_analytics(expenses: list, trip_data: dict) -> dict:
    """
    Computes exact budget analytics from an in-memory list of expenses and trip dict.
    Formulas:
      - remaining_budget = total_budget - actual_paid_expenses
      - budget_used_percentage = (actual_paid_expenses / total_budget) * 100
      - is_over_budget = actual_paid_expenses > total_budget
      - overrun_amount = actual_paid_expenses - total_budget
    """
    total_budget = round(float(trip_data.get("budget") or 0.0), 2)
    estimated_total = round(float(trip_data.get("estimated_total_cost") or total_budget), 2)
    currency = trip_data.get("currency", "INR")

    actual_paid = 0.0
    pending_payments = 0.0
    refunded_amount = 0.0
    cancelled_amount = 0.0

    category_breakdown = {}

    for exp in expenses:
        amt = float(exp.get("amount", 0.0))
        status = str(exp.get("payment_status", "paid")).lower()
        cat = str(exp.get("category", "other")).lower()

        if cat not in category_breakdown:
            category_breakdown[cat] = {"total_paid": 0.0, "percentage_of_budget": 0.0, "count": 0}

        category_breakdown[cat]["count"] += 1

        if status == "paid":
            actual_paid += amt
            category_breakdown[cat]["total_paid"] += amt
        elif status == "pending":
            pending_payments += amt
        elif status == "refunded":
            refunded_amount += amt
        elif status == "cancelled":
            cancelled_amount += amt

    actual_paid = round(actual_paid, 2)
    pending_payments = round(pending_payments, 2)
    refunded_amount = round(refunded_amount, 2)

    # Core mathematical formula required by specifications:
    # remaining_budget = total_budget - actual_paid_expenses
    remaining_budget = round(total_budget - actual_paid, 2)
    if remaining_budget < 0:
        display_remaining = 0.0
    else:
        display_remaining = remaining_budget

    # budget_used_percentage = (actual_paid_expenses / total_budget) * 100
    if total_budget > 0:
        budget_used_percentage = round((actual_paid / total_budget) * 100, 1)
        for cat, data in category_breakdown.items():
            data["percentage_of_budget"] = round((data["total_paid"] / total_budget) * 100, 1)
            data["total_paid"] = round(data["total_paid"], 2)
    else:
        budget_used_percentage = 0.0

    is_overrun = actual_paid > total_budget if total_budget > 0 else False
    overrun_amount = round(actual_paid - total_budget, 2) if is_overrun else 0.0
    potential_remaining = round(display_remaining - pending_payments, 2)

    return {
        "total_budget": total_budget,
        "estimated_total_cost": estimated_total,
        "currency": currency,
        "actual_paid_expenses": actual_paid,
        "remaining_budget": display_remaining,
        "exact_remaining": remaining_budget,
        "budget_used_percentage": budget_used_percentage,
        "pending_payments": pending_payments,
        "pending_commitments": pending_payments,
        "potential_remaining_budget": potential_remaining,
        "refunded_amount": refunded_amount,
        "cancelled_amount": cancelled_amount,
        "is_overrun": is_overrun,
        "is_over_budget": is_overrun,
        "overrun_amount": overrun_amount,
        "category_spending": {k: round(v["total_paid"], 2) for k, v in category_breakdown.items()},
        "category_breakdown": category_breakdown,
        "total_expense_count": len(expenses),
        "expense_count": len(expenses),
    }


def get_trip_budget_analytics(user_id: str, trip_id: str, trip_data: dict) -> dict:
    """
    Computes exact budget analytics for a user trip.
    """
    owner, tid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or tid is None:
        return {}

    expenses = get_expenses_by_trip(user_id, trip_id)
    return compute_budget_analytics(expenses, trip_data)


def compute_trip_settlement(trip: dict, expenses: list) -> dict:
    """
    Splitwise settlement engine:
    1. Computes total paid vs total owed per traveler:
       Balance(u) = Total_Paid(u) - Total_Owed(u)
    2. Executes greedy min-cash-flow debt simplification to determine minimal debt transfers.
    """
    currency = trip.get("display_currency") or trip.get("currency", "INR")
    
    # Gather all trip members
    members_set = set()
    collaborators = trip.get("collaborators", [])
    for c in collaborators:
        c_name = c.get("name")
        if c_name:
            members_set.add(c_name.strip())

    if not members_set:
        members_set.add("You")
    else:
        members_set.add("You")

    # Also include any names seen in expenses
    for exp in expenses:
        payer = exp.get("paid_by_name") or exp.get("paid_by")
        if payer:
            members_set.add(str(payer).strip())
        for s in exp.get("splits", []):
            s_name = s.get("name")
            if s_name:
                members_set.add(str(s_name).strip())

    all_members = sorted(list(members_set))

    # Balances dictionary: balance > 0 means person gets back; balance < 0 means person owes
    balances = {m: 0.0 for m in all_members}
    total_paid_by_member = {m: 0.0 for m in all_members}
    total_owed_by_member = {m: 0.0 for m in all_members}
    total_expenses_sum = 0.0

    valid_expenses = [
        e for e in expenses 
        if str(e.get("payment_status", "paid")).lower() in ("paid", "confirmed")
    ]

    for exp in valid_expenses:
        amt = float(exp.get("amount", 0.0))
        payer = str(exp.get("paid_by_name") or exp.get("paid_by") or "You").strip()
        if payer not in balances:
            balances[payer] = 0.0
            total_paid_by_member[payer] = 0.0
            total_owed_by_member[payer] = 0.0

        is_settle = (
            bool(exp.get("is_settlement"))
            or str(exp.get("category", "")).lower() == "settlement"
            or str(exp.get("booking_reference", "")).startswith("SETTLE-")
        )

        if is_settle:
            # Settlement payment: debtor pays creditor to reduce debt balance
            balances[payer] += amt
            splits = exp.get("splits") or []
            if splits:
                for s in splits:
                    recipient = str(s.get("name") or "You").strip()
                    if recipient not in balances:
                        balances[recipient] = 0.0
                        total_paid_by_member[recipient] = 0.0
                        total_owed_by_member[recipient] = 0.0
                    s_amt = float(s.get("amount", amt))
                    balances[recipient] -= s_amt
        else:
            # Ordinary travel expense: payer is credited the full payment,
            # and each participant in splits (including payer) is debited their consumed share.
            total_expenses_sum += amt
            balances[payer] += amt
            total_paid_by_member[payer] += amt

            splits = exp.get("splits") or []
            if splits:
                for s in splits:
                    borrower = str(s.get("name") or "You").strip()
                    if borrower not in balances:
                        balances[borrower] = 0.0
                        total_paid_by_member[borrower] = 0.0
                        total_owed_by_member[borrower] = 0.0

                    s_amt = float(s.get("amount", 0.0))
                    balances[borrower] -= s_amt
                    total_owed_by_member[borrower] += s_amt
            else:
                # Equal split among all known members if no explicit split is saved
                n = len(all_members) or 1
                split_share = round(amt / n, 2)
                for m in all_members:
                    balances[m] -= split_share
                    total_owed_by_member[m] += split_share

    # Net balances list
    net_balances = []
    for member in all_members:
        bal = round(balances[member], 2)
        status = "gets_back" if bal > 0.01 else ("owes" if bal < -0.01 else "settled")
        net_balances.append({
            "member": member,
            "balance": bal,
            "abs_balance": abs(bal),
            "total_paid": round(total_paid_by_member.get(member, 0.0), 2),
            "total_owed": round(total_owed_by_member.get(member, 0.0), 2),
            "status": status,
        })

    # Sort net balances by balance descending
    net_balances.sort(key=lambda x: x["balance"], reverse=True)

    # Greedy Min-Cash-Flow Algorithm
    creditors = []
    debtors = []
    for member, bal in balances.items():
        r_bal = round(bal, 2)
        if r_bal > 0.01:
            creditors.append([r_bal, member])
        elif r_bal < -0.01:
            debtors.append([abs(r_bal), member])

    creditors.sort(key=lambda x: x[0], reverse=True)
    debtors.sort(key=lambda x: x[0], reverse=True)

    simplified_debts = []
    c_idx = 0
    d_idx = 0

    while c_idx < len(creditors) and d_idx < len(debtors):
        cred_amt, cred_name = creditors[c_idx]
        debt_amt, debt_name = debtors[d_idx]

        settle_amt = round(min(cred_amt, debt_amt), 2)
        if settle_amt > 0.01:
            simplified_debts.append({
                "from": debt_name,
                "to": cred_name,
                "amount": settle_amt,
                "currency": currency,
            })

        creditors[c_idx][0] = round(creditors[c_idx][0] - settle_amt, 2)
        debtors[d_idx][0] = round(debtors[d_idx][0] - settle_amt, 2)

        if creditors[c_idx][0] <= 0.01:
            c_idx += 1
        if debtors[d_idx][0] <= 0.01:
            d_idx += 1

    return {
        "net_balances": net_balances,
        "simplified_debts": simplified_debts,
        "total_group_spending": round(total_expenses_sum, 2),
        "currency": currency,
        "members": all_members,
    }


def record_debt_settlement(user_id: str, trip_id: str, data: dict) -> dict:
    """
    Record a debt settlement between two group members.
    Creates a settlement expense transaction that balances the debt.
    """
    from_name = str(data.get("from") or data.get("from_name") or "").strip()
    to_name = str(data.get("to") or data.get("to_name") or "").strip()
    amount = round(float(data.get("amount", 0.0)), 2)
    currency = str(data.get("currency") or "INR").upper().strip()

    if not from_name or not to_name or amount <= 0:
        raise ValueError("Valid from, to, and positive amount are required to settle debt.")

    expense_payload = {
        "category": "other",
        "is_settlement": True,
        "amount": amount,
        "currency": currency,
        "date": data.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "payment_status": "paid",
        "description": f"Settlement payment: {from_name} paid {to_name}",
        "booking_reference": f"SETTLE-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "paid_by": from_name,
        "paid_by_name": from_name,
        "split_type": "EXACT",
        "splits": [
            {
                "name": to_name,
                "amount": amount,
                "settled": True,
            }
        ],
    }

    return create_expense(user_id, trip_id, expense_payload)
