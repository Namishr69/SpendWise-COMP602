import gmailAuthService from '../services/gmailAuthService.js';
import gmailService from '../services/gmailService.js';
import gmailSyncService from '../services/gmailSyncService.js';
import priceAlertService from '../services/priceAlertService.js';
import subscriptionRepo from '../repositories/subscriptionRepo.js';
import transactionRepo from '../repositories/transactionRepo.js';

/**
 * Nothing here returns an access or refresh token. The browser only ever
 * receives connection status and non-sensitive mailbox metadata (the connected
 * address, a message count, and recent subjects as proof of read access).
 */

function statusForError(message) {
  if (message === 'No Gmail connection found') return 404;
  if (message.startsWith('Gmail is not configured')) return 503;
  return 400;
}

const gmailController = {
  // POST /api/gmail/connect — begin the OAuth flow
  async connect(req, res) {
    try {
      const result = await gmailAuthService.buildAuthorizationUrl(req.userId);
      res.json(result);
    } catch (error) {
      console.error('Gmail connect failed:', error.message);
      res.status(statusForError(error.message)).json({ error: error.message });
    }
  },

  // POST /api/gmail/callback — finish the OAuth flow and prove read access works
  async callback(req, res) {
    try {
      const { code, state } = req.body || {};

      await gmailAuthService.exchangeCode(req.userId, { code, state });

      // Reading the profile + a few subjects turns "tokens stored" into visible
      // proof. A failure here still leaves a valid connection, so it must not
      // fail the whole request.
      let profile = null;
      let recentSubjects = [];
      let readError = null;

      try {
        profile = await gmailService.getProfile(req.userId);
        recentSubjects = await gmailService.listRecentSubjects(req.userId, { limit: 5 });
      } catch (error) {
        console.error('Gmail connected but reading the inbox failed:', error.message);
        readError = error.message;
      }

      const status = await gmailAuthService.getStatus(req.userId);

      res.json({ ...status, profile, recentSubjects, readError });
    } catch (error) {
      console.error('Gmail callback failed:', error.message);
      res.status(statusForError(error.message)).json({ error: error.message });
    }
  },

  // GET /api/gmail/status — is this user connected?
  async status(req, res) {
    try {
      const status = await gmailAuthService.getStatus(req.userId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/gmail/preview — re-runnable proof of read access (profile + subjects)
  async preview(req, res) {
    try {
      const profile = await gmailService.getProfile(req.userId);
      const recentSubjects = await gmailService.listRecentSubjects(req.userId, { limit: 5 });
      res.json({ ...profile, recentSubjects });
    } catch (error) {
      console.error('Gmail preview failed:', error.message);
      res.status(statusForError(error.message)).json({ error: error.message });
    }
  },

  // DELETE /api/gmail/connection — revoke and forget
  async disconnect(req, res) {
    try {
      const result = await gmailAuthService.disconnect(req.userId);

      // Remove subscriptions that were auto-detected from Gmail.
      // Manually-added subscriptions are never touched.
      try {
        const removedIds = await subscriptionRepo.deleteAllDetected(req.userId, 'gmail-detected');
        console.log(`[gmail-disconnect] removed ${removedIds.length} gmail-detected subscription(s) for user ${req.userId}`);

        // An alert whose subscription is gone has nothing left to display.
        try {
          const removedAlerts = await priceAlertService.removeAlertsForSubscriptions(req.userId, removedIds);
          console.log(`[gmail-disconnect] removed ${removedAlerts} price alert(s) for user ${req.userId}`);
        } catch (error) {
          console.error('Price alert cleanup failed on disconnect:', error.message);
        }
      } catch (error) {
        console.error('Gmail-detected subscription cleanup failed on disconnect:', error.message);
      }

      // Remove transactions extracted from Gmail receipts.
      // Manual transactions are never touched.
      try {
        const removedTxns = await transactionRepo.deleteAllBySource(req.userId, 'gmail-detected');
        console.log(`[gmail-disconnect] removed ${removedTxns} gmail-detected transaction(s) for user ${req.userId}`);
      } catch (error) {
        console.error('Gmail-detected transaction cleanup failed on disconnect:', error.message);
      }

      res.json(result);
    } catch (error) {
      console.error('Gmail disconnect failed:', error.message);
      res.status(statusForError(error.message)).json({ error: error.message });
    }
  },

  // POST /api/gmail/sync — scan the inbox and save subscription data to Firestore
  async sync(req, res) {
    try {
      const summary = await gmailSyncService.syncSubscriptions(req.userId);
      res.json(summary);
    } catch (error) {
      console.error('Gmail sync failed:', error.message);
      res.status(statusForError(error.message)).json({ error: error.message });
    }
  },
};

export default gmailController;
