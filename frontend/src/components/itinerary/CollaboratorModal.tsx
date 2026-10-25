import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  X,
  Share2,
  ShieldCheck,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { Trip, Collaborator } from '../../types/trip';
import { tripService } from '../../services/tripService';

interface CollaboratorModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onTripUpdated?: () => void;
  currentUserId?: string;
}

export const CollaboratorModal: React.FC<CollaboratorModalProps> = ({
  trip,
  isOpen,
  onClose,
  onTripUpdated,
  currentUserId,
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(trip.collaborators || []);
  const [owner, setOwner] = useState<any>(null);
  const [inviteCode, setInviteCode] = useState<string>(trip.invite_code || '');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  const isOwner = !trip.owner_id || trip.owner_id === currentUserId || trip.user_id === currentUserId;

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
    }
  }, [isOpen, trip.id]);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const res = await tripService.getCollaborators(trip.id);
      setCollaborators(res.collaborators || []);
      setOwner(res.owner || null);
      if (res.invite_code) {
        setInviteCode(res.invite_code);
      }
    } catch (err) {
      console.warn('Failed to load collaborators:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/join?code=${inviteCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerateCode = async () => {
    try {
      setGeneratingCode(true);
      const res = await tripService.createInvite(trip.id);
      setInviteCode(res.invite_code);
      if (onTripUpdated) onTripUpdated();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate new invite code.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleRemoveCollaborator = async (targetUserId: string, name: string) => {
    if (!window.confirm(`Revoke collaborator access for ${name}?`)) return;
    try {
      await tripService.removeCollaborator(trip.id, targetUserId);
      setCollaborators((prev) => prev.filter((c) => c.user_id !== targetUserId));
      if (onTripUpdated) onTripUpdated();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove collaborator.');
    }
  };

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareLink = `${origin}/join?code=${inviteCode}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/20 text-primary rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Trip Group Collaboration</h3>
              <p className="text-xs text-muted">Invite travel companions to co-edit itineraries & split costs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-alt text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 py-4">
          {/* Invite Code & Share Box */}
          <div className="bg-background p-4 rounded-2xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Trip Invite Code
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  disabled={generatingCode}
                  className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                  title="Generate new invite code"
                >
                  <RefreshCw className={`w-3 h-3 ${generatingCode ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
              <div className="font-mono text-xl font-bold tracking-widest text-emerald-400 select-all">
                {inviteCode || 'GENERATING...'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-background hover:bg-primary/20 border border-border text-xs font-medium text-text transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-sm shadow-emerald-500/20"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-muted truncate">
              Shareable Join URL: <code className="text-emerald-400/90">{shareLink}</code>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Trip Members ({1 + collaborators.length})
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {/* Owner Item */}
              <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    {(owner?.name || 'O').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text flex items-center gap-1.5">
                      <span>{owner?.name || 'Trip Creator'}</span>
                      <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Owner
                      </span>
                    </div>
                    <div className="text-xs text-muted truncate">{owner?.email || 'Owner'}</div>
                  </div>
                </div>
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              </div>

              {/* Collaborators Items */}
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-primary" />
                </div>
              ) : collaborators.length === 0 ? (
                <div className="p-4 bg-background/50 rounded-xl border border-dashed border-border text-center text-xs text-muted">
                  No co-travelers have joined yet. Share the invite code above to collaborate!
                </div>
              ) : (
                collaborators.map((c) => (
                  <div
                    key={c.user_id}
                    className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/80 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text flex items-center gap-1.5 truncate">
                          <span className="truncate">{c.name}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0">
                            {c.role}
                          </span>
                        </div>
                        <div className="text-xs text-muted truncate">{c.email}</div>
                      </div>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(c.user_id, c.name)}
                        className="p-1.5 text-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors ml-2 shrink-0"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface hover:bg-surface-alt border border-border text-xs font-semibold text-text transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
