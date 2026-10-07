-- ============================================================
--  NETTOYAGE BASE ZAYADO (Hostinger MySQL)  —  98 tables -> 43
--  Objectif : repérer et supprimer les tables EN TROP sans jamais
--  toucher vos 43 tables applicatives (dont `users`).
--
--  ⚠️ AVANT TOUT : FAITES UN BACKUP COMPLET de la base
--     (Hostinger > Bases de données > Exporter / phpMyAdmin > Exporter).
--
--  Ce fichier NE supprime RIEN tout seul :
--   - L'ÉTAPE 1 ne fait que LISTER (aucun risque).
--   - L'ÉTAPE 2 GÉNÈRE le texte des DROP (vous le relisez, puis l'exécutez).
--  Les requêtes ciblent automatiquement la base courante via DATABASE().
-- ============================================================

-- ------------------------------------------------------------
-- ÉTAPE 1 — DIAGNOSTIC (100% SANS RISQUE)
-- Affiche chaque table, une estimation du nombre de lignes, et si
-- elle est « À GARDER » (fait partie des 43) ou « EN TROP ».
-- ------------------------------------------------------------
SELECT
  t.TABLE_NAME                                   AS `table`,
  t.TABLE_ROWS                                   AS lignes_estimees,
  CASE WHEN t.TABLE_NAME IN (
    'abonnements','accueil_choix','agents_business','balance_wheel_data','commerce_orders',
    'copilote_decisions','demandes_collaborateur','emails_ia_brouillons','equipe_membres','idees',
    'leads','login_tokens','mindset_entrees','mindset_lettres','mindset_parcours','processus_data',
    'promo_codes','radar_prospects','radar_signaux','referrals','revues_hebdo','rituels_faits',
    'roadmap_public','saved_articles','user_connections','users','vendor_images','vendor_products',
    'vendor_profiles','vision_balance','vision_board_data','vision_board_spaces','vision_chat_messages',
    'vision_checkins','vision_images','vision_objectifs','vision_pouls_business','vision_profiles',
    'vision_roadmap_items','vision_shares','vision_taches','vision_victoires','vision_weekly_mails'
  ) THEN 'A GARDER' ELSE 'EN TROP (candidate suppression)' END AS statut
FROM information_schema.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE()
ORDER BY statut, t.TABLE_NAME;

-- ------------------------------------------------------------
-- ÉTAPE 2 — GÉNÉRATION DES DROP (ne supprime pas : produit du texte)
-- Copiez le résultat de la colonne `script_suppression`, RELISEZ-le,
-- vérifiez qu'aucune table utile n'y figure, puis exécutez-le
-- (APRÈS backup). Les tables des 43 sont automatiquement exclues.
-- ------------------------------------------------------------
SELECT GROUP_CONCAT(
         CONCAT('DROP TABLE IF EXISTS `', TABLE_NAME, '`;')
         ORDER BY TABLE_NAME SEPARATOR '\n'
       ) AS script_suppression
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT IN (
    'abonnements','accueil_choix','agents_business','balance_wheel_data','commerce_orders',
    'copilote_decisions','demandes_collaborateur','emails_ia_brouillons','equipe_membres','idees',
    'leads','login_tokens','mindset_entrees','mindset_lettres','mindset_parcours','processus_data',
    'promo_codes','radar_prospects','radar_signaux','referrals','revues_hebdo','rituels_faits',
    'roadmap_public','saved_articles','user_connections','users','vendor_images','vendor_products',
    'vendor_profiles','vision_balance','vision_board_data','vision_board_spaces','vision_chat_messages',
    'vision_checkins','vision_images','vision_objectifs','vision_pouls_business','vision_profiles',
    'vision_roadmap_items','vision_shares','vision_taches','vision_victoires','vision_weekly_mails'
  );

-- ------------------------------------------------------------
-- CONSEIL : si certaines tables « EN TROP » contiennent des lignes
-- que vous voulez garder par précaution, exportez-les d'abord,
-- ou renommez-les au lieu de les supprimer :
--   RENAME TABLE `ancienne_table` TO `zz_ancienne_table_sauvegarde`;
-- Vous pourrez les supprimer plus tard une fois l'app validée.
-- ============================================================
