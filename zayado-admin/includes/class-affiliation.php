<?php
defined('ABSPATH') || exit;

/**
 * Zayado_Affiliation
 * Gestion complète des affiliés, partenaires, commissions et parrainages.
 * Inspiré de AffiliationTab.js de app-main — adapté en PHP pour WordPress.
 */
class Zayado_Affiliation {

    private static function headers(): array {
        return ['Authorization' => 'Bearer ' . Zayado_API::get_token()];
    }

    public static function render(): void {
        $message = '';
        $section = sanitize_text_field($_GET['section'] ?? 'config');

        // ── Actions POST ──────────────────────────────────────
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('zayado_affiliation')) {
            $action = sanitize_text_field($_POST['zayado_action'] ?? '');

            if ($action === 'save_tiers') {
                $tiers = [];
                foreach (['bronze', 'silver', 'gold', 'diamond'] as $tier) {
                    $tiers[$tier] = [
                        'label'           => ucfirst($tier),
                        'min_sales'       => intval($_POST["tier_{$tier}_min_sales"] ?? 0),
                        'commission_rate' => floatval($_POST["tier_{$tier}_rate"] ?? 10) / 100,
                    ];
                }
                $res     = Zayado_API::put('/affiliate/admin/tiers', ['tiers' => $tiers]);
                $message = $res['success'] ? '✅ Taux de commission enregistrés !' : '❌ ' . $res['error'];
            }

            if ($action === 'save_ref_settings') {
                $res = Zayado_API::put('/admin/platform-settings', [
                    'referral_bonus_referrer' => intval($_POST['bonus_referrer'] ?? 50),
                    'referral_bonus_new_user' => intval($_POST['bonus_new_user'] ?? 25),
                ]);
                $message = $res['success'] ? '✅ Bonus parrainage enregistrés !' : '❌ ' . $res['error'];
            }

            if ($action === 'add_affiliate') {
                $res = Zayado_API::post('/affiliate/admin/create', [
                    'email'         => sanitize_email($_POST['aff_email'] ?? ''),
                    'name'          => sanitize_text_field($_POST['aff_name'] ?? ''),
                    'role'          => sanitize_text_field($_POST['aff_role'] ?? 'partenaire'),
                    'tier_override' => sanitize_text_field($_POST['aff_tier'] ?? ''),
                    'promo_code'    => sanitize_text_field($_POST['aff_promo'] ?? ''),
                ]);
                $message = $res['success'] ? '✅ Affilié créé !' : '❌ ' . $res['error'];
            }

            if ($action === 'change_tier') {
                $user_id = sanitize_text_field($_POST['user_id'] ?? '');
                $tier    = sanitize_text_field($_POST['new_tier'] ?? 'bronze');
                $res     = Zayado_API::put("/affiliate/admin/{$user_id}/tier", ['tier' => $tier]);
                $message = $res['success'] ? '✅ Palier mis à jour !' : '❌ ' . $res['error'];
            }

            if ($action === 'approve_payout') {
                $payout_id = sanitize_text_field($_POST['payout_id'] ?? '');
                $res       = Zayado_API::post("/affiliate/admin/payout/{$payout_id}/approve", []);
                $message   = $res['success'] ? '✅ Retrait approuvé !' : '❌ ' . $res['error'];
            }
        }

        // ── Charger les données ────────────────────────────────
        $affiliates_res = Zayado_API::get('/affiliate/admin/affiliates');
        $affiliates     = $affiliates_res['success'] ? ($affiliates_res['data'] ?? []) : [];

        $payouts_res = Zayado_API::get('/affiliate/admin/payouts');
        $payouts     = $payouts_res['success'] ? ($payouts_res['data'] ?? []) : [];

        $tiers_res = Zayado_API::get('/affiliate/admin/tiers');
        $tiers     = $tiers_res['success'] ? ($tiers_res['data'] ?? self::default_tiers()) : self::default_tiers();

        $settings_res = Zayado_API::get('/admin/platform-settings');
        $settings     = $settings_res['success'] ? ($settings_res['data'] ?? []) : [];

        $referrals_res = Zayado_API::get('/admin/referrals?limit=50');
        $referrals     = $referrals_res['success'] ? ($referrals_res['data']['referrals'] ?? []) : [];

        // ── Stats globales ─────────────────────────────────────
        $total_commissions = array_sum(array_column($affiliates, 'total_commissions'));
        $total_referrals   = array_sum(array_column($affiliates, 'total_referrals'));

        $tier_meta = [
            'bronze'  => ['label' => 'Bronze',  'color' => '#92400e', 'bg' => '#fef3c7'],
            'silver'  => ['label' => 'Silver',  'color' => '#475569', 'bg' => '#f1f5f9'],
            'gold'    => ['label' => 'Gold',    'color' => '#d97706', 'bg' => '#fffbeb'],
            'diamond' => ['label' => 'Diamond', 'color' => '#0e7490', 'bg' => '#ecfeff'],
        ];
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>🤝 Affiliation & Partenariats</h1>
                <p class="zayado-subtitle">Gérez vos affiliés, taux de commission, parrainages et retraits.</p>
            </div>

            <?php if ($message): ?>
            <div class="zayado-alert <?php echo strpos($message, '✅') !== false ? 'zayado-alert-success' : 'zayado-alert-error'; ?>">
                <?php echo esc_html($message); ?>
            </div>
            <?php endif; ?>

            <!-- Stats globales -->
            <div class="zayado-grid zayado-grid-4" style="margin-bottom:20px">
                <div class="zayado-card" style="text-align:center">
                    <div class="zayado-card-label">Affiliés total</div>
                    <div class="zayado-card-value" style="color:#D6A85F"><?php echo count($affiliates); ?></div>
                </div>
                <div class="zayado-card" style="text-align:center">
                    <div class="zayado-card-label">Parrainages</div>
                    <div class="zayado-card-value" style="color:#5DCAA5"><?php echo number_format($total_referrals); ?></div>
                </div>
                <div class="zayado-card" style="text-align:center">
                    <div class="zayado-card-label">Commissions totales</div>
                    <div class="zayado-card-value" style="color:#5DCAA5"><?php echo number_format($total_commissions, 2); ?> €</div>
                </div>
                <div class="zayado-card" style="text-align:center">
                    <div class="zayado-card-label">Taux commission</div>
                    <div class="zayado-card-value" style="color:#D6A85F">
                        <?php echo round(($tiers['bronze']['commission_rate'] ?? 0.10) * 100); ?>–<?php echo round(($tiers['diamond']['commission_rate'] ?? 0.25) * 100); ?>%
                    </div>
                </div>
            </div>

            <!-- Sous-navigation -->
            <div style="display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:10px;margin-bottom:20px;flex-wrap:wrap">
                <?php foreach ([
                    ['config',      '⚙️ Taux & Config'],
                    ['affilies',    '🏆 Affiliés (' . count($affiliates) . ')'],
                    ['parrainages', '👥 Parrainages'],
                    ['retraits',    '💰 Retraits (' . count($payouts) . ')'],
                ] as [$id, $label]): ?>
                <a href="<?php echo add_query_arg(['page' => 'zayado-affiliation', 'section' => $id]); ?>"
                   style="flex:1;text-align:center;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;
                          <?php echo $section === $id ? 'background:#fff;color:#0B1F3A;box-shadow:0 1px 3px rgba(0,0,0,.1)' : 'color:#64748b'; ?>">
                    <?php echo esc_html($label); ?>
                </a>
                <?php endforeach; ?>
            </div>

            <!-- ═══ CONFIG : TAUX DE COMMISSION ═══ -->
            <?php if ($section === 'config'): ?>
            <div class="zayado-card-full">
                <h2>🏅 Paliers de commission affiliés</h2>
                <p class="muted" style="font-size:13px;margin-bottom:16px">
                    Définissez le pourcentage de commission selon le nombre de ventes réalisées par l'affilié.
                </p>
                <form method="post">
                    <?php wp_nonce_field('zayado_affiliation'); ?>
                    <input type="hidden" name="zayado_action" value="save_tiers" />
                    <div class="zayado-grid zayado-grid-4" style="margin-bottom:16px">
                        <?php foreach ($tier_meta as $key => $meta):
                            $tier = $tiers[$key] ?? ['min_sales' => 0, 'commission_rate' => 0.10];
                        ?>
                        <div style="border:2px solid <?php echo esc_attr($meta['color']); ?>40;background:<?php echo esc_attr($meta['bg']); ?>;border-radius:12px;padding:16px">
                            <div style="font-size:14px;font-weight:700;color:<?php echo esc_attr($meta['color']); ?>;margin-bottom:12px">
                                ⭐ <?php echo esc_html($meta['label']); ?>
                            </div>
                            <div class="zayado-form-row">
                                <label>Commission (%)</label>
                                <input type="number" name="tier_<?php echo $key; ?>_rate" min="0" max="100" step="1"
                                    value="<?php echo round($tier['commission_rate'] * 100); ?>"
                                    class="zayado-input" style="width:80px;text-align:center;font-size:18px;font-weight:700" />
                            </div>
                            <div class="zayado-form-row">
                                <label>Ventes min.</label>
                                <input type="number" name="tier_<?php echo $key; ?>_min_sales" min="0" step="1"
                                    value="<?php echo intval($tier['min_sales'] ?? 0); ?>"
                                    class="zayado-input" style="width:80px" />
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <button type="submit" class="zayado-btn zayado-btn-gold">💾 Enregistrer les taux</button>
                </form>
            </div>

            <div class="zayado-card-full">
                <h2>🎁 Bonus parrainage utilisateurs</h2>
                <p class="muted" style="font-size:13px;margin-bottom:16px">
                    Crédits offerts quand un utilisateur parraine quelqu'un (en crédits MyExtension AI).
                </p>
                <form method="post">
                    <?php wp_nonce_field('zayado_affiliation'); ?>
                    <input type="hidden" name="zayado_action" value="save_ref_settings" />
                    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px">
                        <div class="zayado-form-row">
                            <label>Crédits offerts au parrain</label>
                            <input type="number" name="bonus_referrer" min="0" class="zayado-input" style="width:120px"
                                value="<?php echo intval($settings['referral_bonus_referrer'] ?? 50); ?>" />
                        </div>
                        <div class="zayado-form-row">
                            <label>Crédits offerts au filleul</label>
                            <input type="number" name="bonus_new_user" min="0" class="zayado-input" style="width:120px"
                                value="<?php echo intval($settings['referral_bonus_new_user'] ?? 25); ?>" />
                        </div>
                    </div>
                    <button type="submit" class="zayado-btn zayado-btn-gold">💾 Enregistrer les bonus</button>
                </form>
            </div>

            <!-- ═══ AFFILIÉS ═══ -->
            <?php elseif ($section === 'affilies'): ?>
            <!-- Ajouter un affilié -->
            <div class="zayado-card-full" style="margin-bottom:20px">
                <h2>➕ Ajouter un affilié / partenaire</h2>
                <form method="post" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
                    <?php wp_nonce_field('zayado_affiliation'); ?>
                    <input type="hidden" name="zayado_action" value="add_affiliate" />
                    <div>
                        <label class="zayado-card-label" style="display:block;margin-bottom:4px">Email</label>
                        <input type="email" name="aff_email" required class="zayado-input" placeholder="partenaire@exemple.com" />
                    </div>
                    <div>
                        <label class="zayado-card-label" style="display:block;margin-bottom:4px">Nom</label>
                        <input type="text" name="aff_name" class="zayado-input" placeholder="Nom complet" />
                    </div>
                    <div>
                        <label class="zayado-card-label" style="display:block;margin-bottom:4px">Rôle</label>
                        <select name="aff_role" class="zayado-select">
                            <option value="partenaire">Partenaire</option>
                            <option value="ambassadeur">Ambassadeur</option>
                            <option value="influenceur">Influenceur</option>
                            <option value="revendeur">Revendeur</option>
                        </select>
                    </div>
                    <div>
                        <label class="zayado-card-label" style="display:block;margin-bottom:4px">Palier forcé</label>
                        <select name="aff_tier" class="zayado-select">
                            <option value="">Auto</option>
                            <option value="bronze">Bronze</option>
                            <option value="silver">Silver</option>
                            <option value="gold">Gold</option>
                            <option value="diamond">Diamond</option>
                        </select>
                    </div>
                    <div>
                        <label class="zayado-card-label" style="display:block;margin-bottom:4px">Code promo</label>
                        <input type="text" name="aff_promo" class="zayado-input" placeholder="PARTNER20" style="width:120px" />
                    </div>
                    <button type="submit" class="zayado-btn zayado-btn-gold" style="height:42px">➕ Ajouter</button>
                </form>
            </div>

            <!-- Liste affiliés -->
            <div class="zayado-table-wrap">
                <table class="zayado-table">
                    <thead>
                        <tr>
                            <th>Affilié</th>
                            <th>Code</th>
                            <th>Rôle</th>
                            <th>Palier</th>
                            <th>Parrainages</th>
                            <th>Ventes</th>
                            <th>Commissions</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($affiliates)): ?>
                        <tr><td colspan="8" class="zayado-empty">Aucun affilié pour le moment. Ajoutez votre premier partenaire ci-dessus.</td></tr>
                        <?php else: foreach ($affiliates as $a):
                            $tier_id  = $a['tier']['id'] ?? 'bronze';
                            $tier_m   = $tier_meta[$tier_id] ?? $tier_meta['bronze'];
                        ?>
                        <tr>
                            <td>
                                <p style="font-weight:600;color:var(--z-text)"><?php echo esc_html($a['name'] ?? '—'); ?></p>
                                <p style="font-size:11px;color:var(--z-muted)"><?php echo esc_html($a['email'] ?? ''); ?></p>
                            </td>
                            <td>
                                <span class="zayado-mono"><?php echo esc_html($a['referral_code'] ?? '—'); ?></span>
                            </td>
                            <td><?php echo esc_html($a['role'] ?? 'partenaire'); ?></td>
                            <td>
                                <span style="padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;
                                    background:<?php echo esc_attr($tier_m['bg']); ?>;color:<?php echo esc_attr($tier_m['color']); ?>">
                                    <?php echo esc_html($tier_m['label']); ?>
                                    (<?php echo round(($tiers[$tier_id]['commission_rate'] ?? 0.10) * 100); ?>%)
                                </span>
                            </td>
                            <td><?php echo intval($a['total_referrals'] ?? 0); ?></td>
                            <td><?php echo intval($a['total_sales'] ?? 0); ?></td>
                            <td style="font-weight:700;color:#5DCAA5"><?php echo number_format($a['total_commissions'] ?? 0, 2); ?> €</td>
                            <td>
                                <form method="post" style="display:inline-flex;gap:4px;align-items:center">
                                    <?php wp_nonce_field('zayado_affiliation'); ?>
                                    <input type="hidden" name="zayado_action" value="change_tier" />
                                    <input type="hidden" name="user_id" value="<?php echo esc_attr($a['id']); ?>" />
                                    <select name="new_tier" class="zayado-select-sm">
                                        <?php foreach ($tier_meta as $tk => $tm): ?>
                                        <option value="<?php echo $tk; ?>" <?php selected($tier_id, $tk); ?>><?php echo esc_html($tm['label']); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <button type="submit" class="zayado-btn-sm">✓</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; endif; ?>
                    </tbody>
                </table>
            </div>

            <!-- ═══ PARRAINAGES ═══ -->
            <?php elseif ($section === 'parrainages'): ?>
            <div class="zayado-table-wrap">
                <table class="zayado-table">
                    <thead>
                        <tr><th>Parrain</th><th>Filleul</th><th>Code utilisé</th><th>Statut</th><th>Bonus</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                        <?php if (empty($referrals)): ?>
                        <tr><td colspan="6" class="zayado-empty">Aucun parrainage pour le moment.</td></tr>
                        <?php else: foreach ($referrals as $r):
                            $s = $r['status'] ?? 'pending';
                            $cls = $s === 'completed' ? 'green' : ($s === 'expired' ? '' : 'amber');
                        ?>
                        <tr>
                            <td>
                                <p style="font-weight:600"><?php echo esc_html($r['referrer_name'] ?? '—'); ?></p>
                                <p style="font-size:11px;color:var(--z-muted)"><?php echo esc_html($r['referrer_email'] ?? ''); ?></p>
                            </td>
                            <td>
                                <p><?php echo esc_html($r['referee_name'] ?? '—'); ?></p>
                                <p style="font-size:11px;color:var(--z-muted)"><?php echo esc_html($r['referee_email'] ?? ''); ?></p>
                            </td>
                            <td><span class="zayado-mono"><?php echo esc_html($r['code'] ?? '—'); ?></span></td>
                            <td>
                                <span class="zayado-pill zayado-pill-<?php echo $cls; ?>">
                                    <?php echo $s === 'completed' ? '✓ Validé' : ($s === 'expired' ? 'Expiré' : '⏳ En attente'); ?>
                                </span>
                            </td>
                            <td><?php echo intval($r['bonus_credits'] ?? 0); ?> crédits</td>
                            <td><?php echo $r['created_at'] ? date('d/m/Y', strtotime($r['created_at'])) : '—'; ?></td>
                        </tr>
                        <?php endforeach; endif; ?>
                    </tbody>
                </table>
            </div>

            <!-- ═══ RETRAITS ═══ -->
            <?php elseif ($section === 'retraits'): ?>
            <div class="zayado-table-wrap">
                <table class="zayado-table">
                    <thead>
                        <tr><th>Affilié</th><th>Montant</th><th>Méthode</th><th>Statut</th><th>Date</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        <?php if (empty($payouts)): ?>
                        <tr><td colspan="6" class="zayado-empty">Aucun retrait demandé.</td></tr>
                        <?php else: foreach ($payouts as $p):
                            $s = $p['status'] ?? 'pending';
                            $cls = $s === 'completed' ? 'green' : ($s === 'processing' ? 'blue' : 'amber');
                            $methods = ['credits' => '💎 Crédits', 'bank_transfer' => '🏦 Virement', 'paypal' => '🅿️ PayPal'];
                        ?>
                        <tr>
                            <td>
                                <p style="font-weight:600"><?php echo esc_html($p['affiliate_name'] ?? '—'); ?></p>
                                <p style="font-size:11px;color:var(--z-muted)"><?php echo esc_html($p['affiliate_email'] ?? ''); ?></p>
                            </td>
                            <td style="font-weight:700;font-size:15px"><?php echo number_format($p['amount'] ?? 0, 2); ?> €</td>
                            <td><?php echo $methods[$p['method'] ?? ''] ?? esc_html($p['method'] ?? '—'); ?></td>
                            <td>
                                <span class="zayado-pill zayado-pill-<?php echo $cls; ?>">
                                    <?php echo $s === 'completed' ? '✓ Payé' : ($s === 'processing' ? '⏳ Traitement' : '⌛ En attente'); ?>
                                </span>
                            </td>
                            <td><?php echo $p['created_at'] ? date('d/m/Y', strtotime($p['created_at'])) : '—'; ?></td>
                            <td>
                                <?php if ($s !== 'completed'): ?>
                                <form method="post" style="display:inline">
                                    <?php wp_nonce_field('zayado_affiliation'); ?>
                                    <input type="hidden" name="zayado_action" value="approve_payout" />
                                    <input type="hidden" name="payout_id" value="<?php echo esc_attr($p['id']); ?>" />
                                    <button type="submit" class="zayado-btn-sm zayado-btn-gold">✓ Approuver</button>
                                </form>
                                <?php else: echo '—'; endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; endif; ?>
                    </tbody>
                </table>
            </div>
            <?php endif; ?>

        </div>
        <?php
    }

    private static function default_tiers(): array {
        return [
            'bronze'  => ['label' => 'Bronze',  'min_sales' => 0,  'commission_rate' => 0.10],
            'silver'  => ['label' => 'Silver',  'min_sales' => 5,  'commission_rate' => 0.15],
            'gold'    => ['label' => 'Gold',    'min_sales' => 15, 'commission_rate' => 0.20],
            'diamond' => ['label' => 'Diamond', 'min_sales' => 50, 'commission_rate' => 0.25],
        ];
    }
}
