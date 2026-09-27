-- Zayado — schéma complet attendu (MySQL). Référence, NE PAS exécuter tel quel.
-- Pour synchroniser la prod sans perdre de données : scripts/sync_schema.py


CREATE TABLE abonnements (
	user_id VARCHAR(36) NOT NULL, 
	plan VARCHAR(20) NOT NULL, 
	cycle VARCHAR(10) NOT NULL, 
	fondateur BOOL NOT NULL, 
	fin DATETIME, 
	essai_le DATETIME, 
	updated_at DATETIME NOT NULL, 
	mollie_customer_id VARCHAR(64), 
	mollie_subscription_id VARCHAR(64), 
	montant_ttc VARCHAR(20), 
	resilie BOOL NOT NULL, 
	rappel_le DATETIME, 
	plan_suivant VARCHAR(20), 
	PRIMARY KEY (user_id)
)

;


CREATE TABLE agents_business (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	nom_marque VARCHAR(120) NOT NULL, 
	couleur VARCHAR(9) NOT NULL, 
	message_accueil VARCHAR(500) NOT NULL, 
	ton VARCHAR(30) NOT NULL, 
	connaissances TEXT NOT NULL, 
	contact_humain VARCHAR(255) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE balance_wheel_data (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	pillars JSON NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE commerce_orders (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36), 
	email VARCHAR(255) NOT NULL, 
	kind VARCHAR(30) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	amount VARCHAR(20) NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	mollie_payment_id VARCHAR(120), 
	access_url TEXT, 
	metadata_json JSON NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (mollie_payment_id)
)

;


CREATE TABLE copilote_decisions (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	titre VARCHAR(300) NOT NULL, 
	note TEXT, 
	statut VARCHAR(20) NOT NULL, 
	canal VARCHAR(20), 
	origine VARCHAR(40) NOT NULL, 
	created_at DATETIME NOT NULL, 
	decided_at DATETIME, 
	PRIMARY KEY (id)
)

;


CREATE TABLE demandes_collaborateur (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	message TEXT NOT NULL, 
	contact VARCHAR(255) NOT NULL, 
	canal VARCHAR(50) NOT NULL, 
	statut VARCHAR(20) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE emails_ia_brouillons (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	sujet VARCHAR(250) NOT NULL, 
	html TEXT NOT NULL, 
	texte TEXT, 
	intention TEXT, 
	analyse TEXT, 
	destinataires TEXT NOT NULL, 
	statut VARCHAR(20) NOT NULL, 
	resultat TEXT, 
	apercu_envoye INTEGER NOT NULL, 
	cree_le DATETIME NOT NULL, 
	envoye_le DATETIME, 
	PRIMARY KEY (id)
)

;


CREATE TABLE equipe_membres (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_equipe_owner_email UNIQUE (owner_id, email)
)

;


CREATE TABLE idees (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	titre VARCHAR(400) NOT NULL, 
	description TEXT, 
	statut VARCHAR(10) NOT NULL, 
	impact INTEGER NOT NULL, 
	effort INTEGER NOT NULL, 
	objectif_id VARCHAR(36), 
	source VARCHAR(20) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE leads (
	id VARCHAR(36) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	source VARCHAR(100) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE login_tokens (
	id VARCHAR(36) NOT NULL, 
	token VARCHAR(64) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	expires_at DATETIME NOT NULL, 
	used BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE mindset_entrees (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	source VARCHAR(20) NOT NULL, 
	ref VARCHAR(80) NOT NULL, 
	titre VARCHAR(200) NOT NULL, 
	reponses JSON NOT NULL, 
	jour VARCHAR(10) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE mindset_lettres (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	texte TEXT NOT NULL, 
	ouvre_le VARCHAR(10) NOT NULL, 
	lue_le VARCHAR(10), 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE mindset_parcours (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	parcours_id VARCHAR(40) NOT NULL, 
	jours_faits JSON NOT NULL, 
	derniere_date VARCHAR(10), 
	demarre_le VARCHAR(10) NOT NULL, 
	termine_le VARCHAR(10), 
	PRIMARY KEY (id), 
	CONSTRAINT uq_mindset_parcours UNIQUE (user_id, parcours_id)
)

;


CREATE TABLE processus_data (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	items JSON NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE promo_codes (
	id VARCHAR(36) NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	type VARCHAR(20) NOT NULL, 
	value INTEGER NOT NULL, 
	max_uses INTEGER NOT NULL, 
	current_uses INTEGER NOT NULL, 
	active BOOL NOT NULL, 
	expires_at DATETIME, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE radar_prospects (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	apollo_id VARCHAR(64) NOT NULL, 
	jour VARCHAR(10) NOT NULL, 
	prenom VARCHAR(120) NOT NULL, 
	nom VARCHAR(160) NOT NULL, 
	titre VARCHAR(255) NOT NULL, 
	entreprise VARCHAR(255) NOT NULL, 
	domaine VARCHAR(255), 
	linkedin VARCHAR(500), 
	email VARCHAR(255), 
	ville VARCHAR(160), 
	message TEXT NOT NULL, 
	enrichi VARCHAR(5) NOT NULL, 
	statut VARCHAR(20) NOT NULL, 
	`role` VARCHAR(20), 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_prospect_user_apollo UNIQUE (user_id, apollo_id)
)

;


CREATE TABLE radar_signaux (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	cle VARCHAR(80) NOT NULL, 
	data JSON NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_signal_user_cle UNIQUE (user_id, cle)
)

;


CREATE TABLE revues_hebdo (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	semaine VARCHAR(10) NOT NULL, 
	reponses JSON NOT NULL, 
	synthese TEXT, 
	energie_moyenne INTEGER, 
	langue VARCHAR(2) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE rituels_faits (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	jour VARCHAR(10) NOT NULL, 
	rituel VARCHAR(10) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_rituel_jour UNIQUE (user_id, jour, rituel)
)

;


CREATE TABLE roadmap_public (
	id VARCHAR(36) NOT NULL, 
	quarter VARCHAR(20) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	`desc` TEXT NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	visible BOOL NOT NULL, 
	position INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE saved_articles (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	titre VARCHAR(400) NOT NULL, 
	lien TEXT, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE user_connections (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	provider VARCHAR(30) NOT NULL, 
	label VARCHAR(120), 
	status VARCHAR(20) NOT NULL, 
	phone_number VARCHAR(30), 
	credentials_enc TEXT, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	revoked_at DATETIME, 
	PRIMARY KEY (id)
)

;


CREATE TABLE users (
	id VARCHAR(36) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	`role` VARCHAR(20) NOT NULL, 
	credits INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vendor_images (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	mime VARCHAR(40) NOT NULL, 
	data BLOB(16777216) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vendor_products (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	titre VARCHAR(255) NOT NULL, 
	description TEXT NOT NULL, 
	prix VARCHAR(20) NOT NULL, 
	stock INTEGER, 
	sku VARCHAR(80), 
	categorie VARCHAR(120), 
	images JSON NOT NULL, 
	statut VARCHAR(20) NOT NULL, 
	vendeur VARCHAR(120) NOT NULL, 
	motif_refus TEXT NOT NULL, 
	shopify_id VARCHAR(120) NOT NULL, 
	shopify_handle VARCHAR(255), 
	created_at DATETIME NOT NULL, 
	maj_le DATETIME NOT NULL, 
	soumis_le DATETIME, 
	publie_le DATETIME, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vendor_profiles (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_balance (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	pro INTEGER NOT NULL, 
	perso INTEGER NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_board_data (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	cards JSON NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_board_spaces (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	cle VARCHAR(40) NOT NULL, 
	nom VARCHAR(80) NOT NULL, 
	emoji VARCHAR(8) NOT NULL, 
	cards JSON NOT NULL, 
	ordre INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_chat_messages (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	`role` VARCHAR(12) NOT NULL, 
	contenu TEXT NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_checkins (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	date VARCHAR(10) NOT NULL, 
	energie INTEGER NOT NULL, 
	stress INTEGER NOT NULL, 
	sommeil INTEGER NOT NULL, 
	charge INTEGER NOT NULL, 
	mood VARCHAR(30), 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_images (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	prompt TEXT NOT NULL, 
	mime VARCHAR(40) NOT NULL, 
	data BLOB(16777216) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_objectifs (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	titre VARCHAR(300) NOT NULL, 
	echeance VARCHAR(10), 
	progression INTEGER NOT NULL, 
	statut VARCHAR(20) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_pouls_business (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	ca_mensuel INTEGER NOT NULL, 
	ca_objectif INTEGER NOT NULL, 
	factures_en_attente INTEGER NOT NULL, 
	tresorerie INTEGER NOT NULL, 
	source VARCHAR(20) NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_profiles (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	prenom VARCHAR(100), 
	texte_vision TEXT, 
	pourquoi TEXT, 
	valeurs JSON NOT NULL, 
	heure_checkin VARCHAR(5) NOT NULL, 
	plan VARCHAR(20) NOT NULL, 
	notifications BOOL NOT NULL, 
	fuseau VARCHAR(64) NOT NULL, 
	email VARCHAR(200), 
	onboarded BOOL NOT NULL, 
	contexte_metier JSON NOT NULL, 
	objectif_3ans VARCHAR(300), 
	echeance_3ans VARCHAR(10), 
	debut_3ans VARCHAR(10), 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_roadmap_items (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	quarter VARCHAR(2) NOT NULL, 
	titre VARCHAR(300) NOT NULL, 
	done BOOL NOT NULL, 
	ordre INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_shares (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	board VARCHAR(40) NOT NULL, 
	token VARCHAR(64) NOT NULL, 
	hide_finances BOOL NOT NULL, 
	hide_energie BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_vision_share_board UNIQUE (user_id, board)
)

;


CREATE TABLE vision_taches (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	titre VARCHAR(300) NOT NULL, 
	duree_min INTEGER NOT NULL, 
	progression INTEGER NOT NULL, 
	icon VARCHAR(30) NOT NULL, 
	micro BOOL NOT NULL, 
	statut VARCHAR(20) NOT NULL, 
	objectif_id VARCHAR(36), 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_victoires (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	texte VARCHAR(500) NOT NULL, 
	detail TEXT, 
	date VARCHAR(10) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE vision_weekly_mails (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	semaine VARCHAR(10) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_vision_weekly_mail UNIQUE (user_id, semaine)
)

;


CREATE TABLE referrals (
	id VARCHAR(36) NOT NULL, 
	referrer_id VARCHAR(36) NOT NULL, 
	referred_email VARCHAR(255) NOT NULL, 
	referred_id VARCHAR(36), 
	statut VARCHAR(20) NOT NULL, 
	bonus_credits INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(referrer_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(referred_id) REFERENCES users (id) ON DELETE SET NULL
)

;


CREATE TABLE accueil_choix (
	id VARCHAR(36) NOT NULL, 
	choix VARCHAR(20) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)

;
CREATE INDEX ix_accueil_choix_choix ON accueil_choix (choix)
;