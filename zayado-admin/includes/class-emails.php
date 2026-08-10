<?php
defined('ABSPATH') || exit;

class Zayado_Emails {

    public static function render(): void {
        $message = '';

        if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('zayado_emails')) {
            $to      = sanitize_email($_POST['to'] ?? '');
            $intent  = sanitize_textarea_field($_POST['intent'] ?? '');
            $auto    = isset($_POST['auto_send']);

            if ($to && $intent) {
                $res = Zayado_API::post('/admin/email/draft', [
                    'to'        => $to,
                    'intent'    => $intent,
                    'auto_send' => $auto,
                ]);
                if ($res['success']) {
                    $message = $auto
                        ? '✅ Email généré et envoyé via Brevo !'
                        : '✅ Brouillon généré et envoyé sur votre email pour validation.';
                } else {
                    $message = '❌ Erreur : ' . $res['error'];
                }
            }
        }

        $history_res = Zayado_API::get('/admin/emails');
        $emails      = $history_res['success'] ? ($history_res['data'] ?? []) : [];
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>📧 Emails IA (Brevo)</h1>
                <p class="zayado-subtitle">Rédigez en langage naturel — l'IA génère l'email pro et l'envoie via Brevo.</p>
            </div>

            <?php if ($message): ?>
                <div class="zayado-alert <?php echo strpos($message, '✅') !== false ? 'zayado-alert-success' : 'zayado-alert-error'; ?>">
                    <?php echo esc_html($message); ?>
                </div>
            <?php endif; ?>

            <!-- Composeur -->
            <div class="zayado-card-full">
                <h2>✍️ Composeur Email IA</h2>
                <div class="zayado-info-box">
                    💡 <strong>Mode brouillon</strong> : décrivez l'email en langage naturel. L'IA rédige et vous envoie le brouillon pour validation.
                    <strong>Mode auto</strong> : envoie directement au destinataire via Brevo.
                </div>
                <form method="post">
                    <?php wp_nonce_field('zayado_emails'); ?>
                    <div class="zayado-form-row">
                        <label>Destinataire</label>
                        <input type="email" name="to" required placeholder="utilisateur@exemple.com" class="zayado-input" />
                    </div>
                    <div class="zayado-form-row">
                        <label>Intention (langage naturel)</label>
                        <textarea name="intent" rows="4" required class="zayado-textarea"
                            placeholder="Ex: Remercier ce nouveau client GROW, lui rappeler qu'il peut connecter son Drive dans Paramètres, et lui proposer un appel découverte."></textarea>
                    </div>
                    <div class="zayado-form-row">
                        <label>
                            <input type="checkbox" name="auto_send" />
                            Envoyer directement (sans validation manuelle)
                        </label>
                    </div>
                    <button type="submit" class="zayado-btn zayado-btn-gold">✨ Générer l'email IA</button>
                </form>
            </div>

            <!-- Historique -->
            <div class="zayado-section">
                <h2>Historique des emails</h2>
                <div class="zayado-table-wrap">
                    <table class="zayado-table">
                        <thead>
                            <tr><th>Statut</th><th>Destinataire</th><th>Objet</th><th>Intention</th><th>Date</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            <?php if (empty($emails)): ?>
                            <tr><td colspan="6" class="zayado-empty">Aucun email pour le moment.</td></tr>
                            <?php else: foreach ($emails as $email): ?>
                            <tr>
                                <td>
                                    <?php $s = $email['status'] ?? '—'; $cls = $s === 'sent' ? 'green' : ($s === 'draft' ? 'amber' : 'red'); ?>
                                    <span class="zayado-pill zayado-pill-<?php echo $cls; ?>"><?php echo esc_html($s); ?></span>
                                </td>
                                <td><span class="zayado-mono"><?php echo esc_html($email['to'] ?? '—'); ?></span></td>
                                <td><?php echo esc_html(wp_trim_words($email['subject'] ?? '—', 8)); ?></td>
                                <td><?php echo esc_html(wp_trim_words($email['intent'] ?? '—', 10)); ?></td>
                                <td><?php echo $email['created_at'] ? date('d/m H:i', strtotime($email['created_at'])) : '—'; ?></td>
                                <td>
                                    <?php if (($email['status'] ?? '') === 'draft'): ?>
                                    <form method="post" style="display:inline">
                                        <?php wp_nonce_field('zayado_emails'); ?>
                                        <input type="hidden" name="approve_draft_id" value="<?php echo esc_attr($email['id']); ?>" />
                                        <button type="submit" class="zayado-btn-sm zayado-btn-gold">📤 Approuver</button>
                                    </form>
                                    <?php else: echo '—'; endif; ?>
                                </td>
                            </tr>
                            <?php endforeach; endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <?php
    }
}
