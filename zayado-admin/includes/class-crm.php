<?php
defined('ABSPATH') || exit;

class Zayado_CRM {

    public static function render(): void {
        $message = '';

        if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('zayado_crm')) {
            $action = sanitize_text_field($_POST['zayado_action'] ?? '');

            if ($action === 'send_email') {
                $contact_id = sanitize_text_field($_POST['contact_id'] ?? '');
                $subject    = sanitize_text_field($_POST['subject'] ?? '');
                $body       = sanitize_textarea_field($_POST['body'] ?? '');
                $res = Zayado_API::post('/admin/crm/send-email', [
                    'contact_id' => $contact_id,
                    'subject'    => $subject,
                    'body'       => $body,
                ]);
                $message = $res['success'] ? '✅ Email envoyé via Brevo !' : '❌ ' . $res['error'];
            }

            if ($action === 'sync_brevo') {
                $res     = Zayado_API::post('/admin/crm/sync-brevo', []);
                $message = $res['success'] ? '✅ Synchronisation Brevo effectuée !' : '❌ ' . $res['error'];
            }

            if ($action === 'sync_hubspot') {
                $res     = Zayado_API::post('/admin/crm/sync-hubspot', []);
                $message = $res['success'] ? '✅ Synchronisation HubSpot effectuée !' : '❌ ' . $res['error'];
            }
        }

        // Charger les contacts
        $contacts_res = Zayado_API::get('/admin/crm/contacts?limit=50');
        $contacts     = $contacts_res['success'] ? ($contacts_res['data']['contacts'] ?? []) : [];
        $total        = $contacts_res['success'] ? ($contacts_res['data']['total'] ?? 0) : 0;

        // Charger stats CRM
        $stats_res = Zayado_API::get('/admin/crm/stats');
        $stats     = $stats_res['success'] ? $stats_res['data'] : [];
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>👥 CRM — Contacts & Leads</h1>
                <p class="zayado-subtitle">Données des utilisateurs synchronisées avec Brevo et HubSpot.</p>
            </div>

            <?php if ($message): ?>
            <div class="zayado-alert <?php echo strpos($message, '✅') !== false ? 'zayado-alert-success' : 'zayado-alert-error'; ?>">
                <?php echo esc_html($message); ?>
            </div>
            <?php endif; ?>

            <!-- Stats CRM -->
            <div class="zayado-grid zayado-grid-4" style="margin-bottom:24px">
                <?php
                $crm_kpis = [
                    ['Total contacts',    number_format($stats['total_contacts'] ?? $total),    '#D6A85F'],
                    ['Leads actifs',      number_format($stats['active_leads'] ?? 0),           '#5DCAA5'],
                    ['Clients signés',    number_format($stats['signed_clients'] ?? 0),         '#5DCAA5'],
                    ['Emails envoyés',    number_format($stats['emails_sent'] ?? 0),            '#60a5fa'],
                ];
                foreach ($crm_kpis as [$label, $value, $color]):
                ?>
                <div class="zayado-card">
                    <div class="zayado-card-label"><?php echo esc_html($label); ?></div>
                    <div class="zayado-card-value" style="color:<?php echo esc_attr($color); ?>"><?php echo esc_html($value); ?></div>
                </div>
                <?php endforeach; ?>
            </div>

            <!-- Synchronisation -->
            <div class="zayado-card-full" style="margin-bottom:20px">
                <h2>🔄 Synchronisation CRM externe</h2>
                <p class="muted" style="font-size:13px;margin-bottom:14px">
                    Les contacts de MyExtension AI peuvent être synchronisés vers vos outils CRM externes.
                    Configurez les clés API dans <a href="<?php echo admin_url('admin.php?page=zayado-config'); ?>">Configuration</a>.
                </p>
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <form method="post" style="display:inline">
                        <?php wp_nonce_field('zayado_crm'); ?>
                        <input type="hidden" name="zayado_action" value="sync_brevo" />
                        <button type="submit" class="zayado-btn zayado-btn-gold">📧 Sync Brevo (listes contacts)</button>
                    </form>
                    <form method="post" style="display:inline">
                        <?php wp_nonce_field('zayado_crm'); ?>
                        <input type="hidden" name="zayado_action" value="sync_hubspot" />
                        <button type="submit" class="zayado-btn">🔗 Sync HubSpot</button>
                    </form>
                </div>
            </div>

            <!-- Liste contacts -->
            <div class="zayado-section">
                <h2>Contacts (<?php echo number_format($total); ?>)</h2>
                <div class="zayado-table-wrap">
                    <table class="zayado-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Email</th>
                                <th>Plan</th>
                                <th>Statut CRM</th>
                                <th>Dernière activité</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($contacts)): ?>
                            <tr><td colspan="6" class="zayado-empty">Aucun contact. Synchronisez depuis l'API.</td></tr>
                            <?php else: foreach ($contacts as $contact): ?>
                            <tr>
                                <td style="font-weight:600"><?php echo esc_html($contact['name'] ?? '—'); ?></td>
                                <td><span class="zayado-mono"><?php echo esc_html($contact['email'] ?? '—'); ?></span></td>
                                <td>
                                    <span class="zayado-pill zayado-pill-<?php echo esc_attr($contact['plan'] ?? 'free'); ?>">
                                        <?php echo strtoupper(esc_html($contact['plan'] ?? 'free')); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php $s = $contact['crm_status'] ?? 'lead'; $cls = $s === 'client' ? 'green' : ($s === 'prospect' ? 'amber' : 'blue'); ?>
                                    <span class="zayado-pill zayado-pill-<?php echo $cls; ?>"><?php echo esc_html($s); ?></span>
                                </td>
                                <td><?php echo $contact['last_active'] ? date('d/m/Y', strtotime($contact['last_active'])) : '—'; ?></td>
                                <td>
                                    <button onclick="document.getElementById('email-form-<?php echo esc_attr($contact['id']); ?>').style.display='block'"
                                        class="zayado-btn-sm zayado-btn-gold">📧 Email IA</button>
                                    <?php if (!empty($contact['email'])): ?>
                                    <a href="mailto:<?php echo esc_attr($contact['email']); ?>" class="zayado-btn-sm" style="margin-left:4px">✉️</a>
                                    <?php endif; ?>
                                </td>
                            </tr>
                            <!-- Formulaire email inline -->
                            <tr id="email-form-<?php echo esc_attr($contact['id']); ?>" style="display:none">
                                <td colspan="6" style="background:rgba(214,168,95,0.06);padding:16px">
                                    <form method="post">
                                        <?php wp_nonce_field('zayado_crm'); ?>
                                        <input type="hidden" name="zayado_action" value="send_email" />
                                        <input type="hidden" name="contact_id" value="<?php echo esc_attr($contact['id']); ?>" />
                                        <div style="display:flex;flex-direction:column;gap:10px;max-width:600px">
                                            <input type="text" name="subject" required class="zayado-input"
                                                placeholder="Objet de l'email" />
                                            <textarea name="body" rows="4" required class="zayado-textarea"
                                                placeholder="Décrivez l'intention en langage naturel — l'IA rédige l'email"></textarea>
                                            <div style="display:flex;gap:8px">
                                                <button type="submit" class="zayado-btn zayado-btn-gold">✨ Générer & Envoyer via Brevo</button>
                                                <button type="button" onclick="document.getElementById('email-form-<?php echo esc_attr($contact['id']); ?>').style.display='none'"
                                                    class="zayado-btn">Annuler</button>
                                            </div>
                                        </div>
                                    </form>
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
