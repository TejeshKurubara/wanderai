"""Route blueprints and a single helper to register them on the Flask app."""


def register_blueprints(app):
    # Imported inside the function to keep package import order simple and
    # avoid circular imports.
    from routes.auth_routes import auth_bp
    from routes.trip_routes import trips_bp
    from routes.expense_routes import expenses_bp
    from routes.booking_routes import travel_services_bp, bookings_bp
    from routes.currency_routes import currency_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(trips_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(travel_services_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(currency_bp)