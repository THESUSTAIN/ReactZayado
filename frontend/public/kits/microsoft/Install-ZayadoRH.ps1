# Zayado RH — installation MANUELLE (secours). Méthode recommandée : Zayado RH › Paramètres › Installer.
# Prérequis : Install-Module PnP.PowerShell ; une inscription d'app Entra pour PnP (ClientId).
# Relançable : ce qui existe déjà est gardé, seul le manquant est ajouté.
# Corrigé par rapport à l'ancien script : niveaux d'autorisation retrouvés par TYPE (un site en français
# nomme « Contrôle total » ce qui s'appelle « Full Control » en anglais), colonnes créées en XML
# (valeurs par défaut et « date seule » réellement appliquées), identiques à l'installation automatique.
param([Parameter(Mandatory)][string]$SiteUrl,[Parameter(Mandatory)][string]$ClientId)
$ErrorActionPreference = 'Stop'
Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

function Get-Role($kind){ (Get-PnPRoleDefinition | Where-Object { $_.RoleTypeKind -eq $kind } | Select-Object -First 1).Name }
$FULL = Get-Role 'Administrator'; $CONTRIB = Get-Role 'Contributor'; $READ = Get-Role 'Reader'
$boss = 'Onboarding Employeurs'; $emp = 'Onboarding Salaries'
foreach($g in $boss,$emp){ if(-not (Get-PnPGroup -Identity $g -ErrorAction SilentlyContinue)){ New-PnPGroup -Title $g | Out-Null } }
Set-PnPGroupPermissions -Identity $boss -AddRole $FULL
Set-PnPGroupPermissions -Identity $emp -AddRole $READ

function Add-Col($list, $internal, $xml){
  if(Get-PnPField -List $list -Identity $internal -ErrorAction SilentlyContinue){ return }
  Add-PnPFieldFromXml -List $list -FieldXml $xml | Out-Null
  $view = Get-PnPView -List $list | Where-Object { $_.DefaultView } | Select-Object -First 1
  if($view){ $view.ViewFields.Add($internal); $view.Update(); Invoke-PnPQuery }
}
function New-L($name, $mode){
  $nouvelle = -not (Get-PnPList -Identity $name -ErrorAction SilentlyContinue)
  if($nouvelle){ New-PnPList -Title $name -Template GenericList -OnQuickLaunch | Out-Null }
  return $nouvelle
}
function Set-Mode($name, $mode){
  switch($mode){
    'Own'     { Set-PnPList -Identity $name -ReadSecurity 2 -WriteSecurity 2
                Set-PnPList -Identity $name -BreakRoleInheritance -CopyRoleAssignments
                Set-PnPListPermission -Identity $name -Group $emp -AddRole $CONTRIB }
    'Shared'  { Set-PnPList -Identity $name -ReadSecurity 1 -WriteSecurity 2
                Set-PnPList -Identity $name -BreakRoleInheritance -CopyRoleAssignments
                Set-PnPListPermission -Identity $name -Group $emp -AddRole $CONTRIB }
    'Ref'     { Set-PnPList -Identity $name -BreakRoleInheritance
                Set-PnPListPermission -Identity $name -Group $boss -AddRole $FULL
                Set-PnPListPermission -Identity $name -Group $emp -AddRole $READ }
    'Private' { Set-PnPList -Identity $name -BreakRoleInheritance
                Set-PnPListPermission -Identity $name -Group $boss -AddRole $FULL }
  }
}

# Annuaire — mode Ref
$n = New-L 'Annuaire' 'Ref'
Add-Col 'Annuaire' 'Email' '<Field Type="Text" DisplayName="Email" Name="Email" StaticName="Email" Required="TRUE" MaxLength="255"></Field>'
Add-Col 'Annuaire' 'Role' '<Field Type="Choice" DisplayName="Role" Name="Role" StaticName="Role" Required="TRUE" Format="Dropdown" FillInChoice="FALSE"><Default>Salarie</Default><CHOICES><CHOICE>Salarie</CHOICE><CHOICE>Employeur</CHOICE></CHOICES></Field>'
Add-Col 'Annuaire' 'Poste' '<Field Type="Text" DisplayName="Poste" Name="Poste" StaticName="Poste" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'Annuaire' 'TelPro' '<Field Type="Text" DisplayName="TelPro" Name="TelPro" StaticName="TelPro" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'Annuaire' 'EmailPro' '<Field Type="Text" DisplayName="EmailPro" Name="EmailPro" StaticName="EmailPro" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'Annuaire' 'TelPersoPartage' '<Field Type="Text" DisplayName="TelPersoPartage" Name="TelPersoPartage" StaticName="TelPersoPartage" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'Annuaire' 'EmailPersoPartage' '<Field Type="Text" DisplayName="EmailPersoPartage" Name="EmailPersoPartage" StaticName="EmailPersoPartage" Required="FALSE" MaxLength="255"></Field>'
if($n){ Set-Mode 'Annuaire' 'Ref' }

# Planning — mode Ref
$n = New-L 'Planning' 'Ref'
Add-Col 'Planning' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'Planning' 'Mois' '<Field Type="Text" DisplayName="Mois" Name="Mois" StaticName="Mois" Required="TRUE" MaxLength="255"></Field>'
Add-Col 'Planning' 'DateEcheance' '<Field Type="DateTime" DisplayName="DateEcheance" Name="DateEcheance" StaticName="DateEcheance" Required="FALSE" Format="DateOnly" />'
Add-Col 'Planning' 'Creneau' '<Field Type="Choice" DisplayName="Creneau" Name="Creneau" StaticName="Creneau" Required="FALSE" Format="Dropdown" FillInChoice="FALSE"><Default>Matin</Default><CHOICES><CHOICE>Matin</CHOICE><CHOICE>Après-midi</CHOICE></CHOICES></Field>'
Add-Col 'Planning' 'Livrable' '<Field Type="Text" DisplayName="Livrable" Name="Livrable" StaticName="Livrable" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'Planning' 'Commentaire' '<Field Type="Note" DisplayName="Commentaire" Name="Commentaire" StaticName="Commentaire" Required="FALSE" NumLines="6" RichText="FALSE"></Field>'
if($n){ Set-Mode 'Planning' 'Ref' }

# Parametres — mode Ref
$n = New-L 'Parametres' 'Ref'
Add-Col 'Parametres' 'Valeur' '<Field Type="Text" DisplayName="Valeur" Name="Valeur" StaticName="Valeur" Required="FALSE" MaxLength="255"></Field>'
if($n){ Set-Mode 'Parametres' 'Ref' }

# AccesOutils — mode Ref
$n = New-L 'AccesOutils' 'Ref'
Add-Col 'AccesOutils' 'Url' '<Field Type="Text" DisplayName="Url" Name="Url" StaticName="Url" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'AccesOutils' 'Identifiant' '<Field Type="Text" DisplayName="Identifiant" Name="Identifiant" StaticName="Identifiant" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'AccesOutils' 'LienCoffre' '<Field Type="Text" DisplayName="LienCoffre" Name="LienCoffre" StaticName="LienCoffre" Required="FALSE" MaxLength="255"></Field>'
if($n){ Set-Mode 'AccesOutils' 'Ref' }

# TypesPieces — mode Ref
$n = New-L 'TypesPieces' 'Ref'
Add-Col 'TypesPieces' 'ParDefaut' '<Field Type="Choice" DisplayName="ParDefaut" Name="ParDefaut" StaticName="ParDefaut" Required="TRUE" Format="Dropdown" FillInChoice="FALSE"><Default>Non</Default><CHOICES><CHOICE>Oui</CHOICE><CHOICE>Non</CHOICE></CHOICES></Field>'
if($n){ Set-Mode 'TypesPieces' 'Ref' }

# PiecesRequises — mode Ref
$n = New-L 'PiecesRequises' 'Ref'
Add-Col 'PiecesRequises' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
if($n){ Set-Mode 'PiecesRequises' 'Ref' }

# Contrats — mode Private
$n = New-L 'Contrats' 'Private'
Add-Col 'Contrats' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'Contrats' 'ModeRemuneration' '<Field Type="Choice" DisplayName="ModeRemuneration" Name="ModeRemuneration" StaticName="ModeRemuneration" Required="TRUE" Format="Dropdown" FillInChoice="FALSE"><Default>Taux horaire</Default><CHOICES><CHOICE>Taux horaire</CHOICE><CHOICE>Forfait jour</CHOICE></CHOICES></Field>'
Add-Col 'Contrats' 'TauxHoraire' '<Field Type="Number" DisplayName="TauxHoraire" Name="TauxHoraire" StaticName="TauxHoraire" Required="FALSE"></Field>'
Add-Col 'Contrats' 'ForfaitJour' '<Field Type="Number" DisplayName="ForfaitJour" Name="ForfaitJour" StaticName="ForfaitJour" Required="FALSE"></Field>'
Add-Col 'Contrats' 'HeuresParJour' '<Field Type="Number" DisplayName="HeuresParJour" Name="HeuresParJour" StaticName="HeuresParJour" Required="FALSE"><Default>7</Default></Field>'
if($n){ Set-Mode 'Contrats' 'Private' }

# DossierSalarie — mode Own
$n = New-L 'DossierSalarie' 'Own'
Add-Col 'DossierSalarie' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'DossierSalarie' 'Mission' '<Field Type="Note" DisplayName="Mission" Name="Mission" StaticName="Mission" Required="FALSE" NumLines="6" RichText="FALSE"></Field>'
Add-Col 'DossierSalarie' 'XP' '<Field Type="Number" DisplayName="XP" Name="XP" StaticName="XP" Required="FALSE"><Default>0</Default></Field>'
Add-Col 'DossierSalarie' 'EmailPerso' '<Field Type="Text" DisplayName="EmailPerso" Name="EmailPerso" StaticName="EmailPerso" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'DossierSalarie' 'TelPerso' '<Field Type="Text" DisplayName="TelPerso" Name="TelPerso" StaticName="TelPerso" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'DossierSalarie' 'NumSecu' '<Field Type="Text" DisplayName="NumSecu" Name="NumSecu" StaticName="NumSecu" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'DossierSalarie' 'PartageTelPerso' '<Field Type="Choice" DisplayName="PartageTelPerso" Name="PartageTelPerso" StaticName="PartageTelPerso" Required="FALSE" Format="Dropdown" FillInChoice="FALSE"><Default>Non</Default><CHOICES><CHOICE>Oui</CHOICE><CHOICE>Non</CHOICE></CHOICES></Field>'
Add-Col 'DossierSalarie' 'PartageEmailPerso' '<Field Type="Choice" DisplayName="PartageEmailPerso" Name="PartageEmailPerso" StaticName="PartageEmailPerso" Required="FALSE" Format="Dropdown" FillInChoice="FALSE"><Default>Non</Default><CHOICES><CHOICE>Oui</CHOICE><CHOICE>Non</CHOICE></CHOICES></Field>'
Add-Col 'DossierSalarie' 'LienDrive' '<Field Type="Text" DisplayName="LienDrive" Name="LienDrive" StaticName="LienDrive" Required="FALSE" MaxLength="255"></Field>'
if($n){ Set-Mode 'DossierSalarie' 'Own' }

# Pieces — mode Own
$n = New-L 'Pieces' 'Own'
Add-Col 'Pieces' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'Pieces' 'Statut' '<Field Type="Choice" DisplayName="Statut" Name="Statut" StaticName="Statut" Required="TRUE" Format="Dropdown" FillInChoice="FALSE"><Default>En attente</Default><CHOICES><CHOICE>En attente</CHOICE><CHOICE>Validé</CHOICE><CHOICE>Refusé</CHOICE></CHOICES></Field>'
Add-Col 'Pieces' 'LienFichier' '<Field Type="Text" DisplayName="LienFichier" Name="LienFichier" StaticName="LienFichier" Required="FALSE" MaxLength="255"></Field>'
if($n){ Set-Mode 'Pieces' 'Own' }

# PlanningPerso — mode Own
$n = New-L 'PlanningPerso' 'Own'
Add-Col 'PlanningPerso' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'PlanningPerso' 'TacheId' '<Field Type="Number" DisplayName="TacheId" Name="TacheId" StaticName="TacheId" Required="TRUE"></Field>'
Add-Col 'PlanningPerso' 'Heure' '<Field Type="Text" DisplayName="Heure" Name="Heure" StaticName="Heure" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'PlanningPerso' 'DureeMin' '<Field Type="Number" DisplayName="DureeMin" Name="DureeMin" StaticName="DureeMin" Required="FALSE"></Field>'
Add-Col 'PlanningPerso' 'Creneau' '<Field Type="Choice" DisplayName="Creneau" Name="Creneau" StaticName="Creneau" Required="FALSE" Format="Dropdown" FillInChoice="FALSE"><CHOICES><CHOICE>Matin</CHOICE><CHOICE>Après-midi</CHOICE></CHOICES></Field>'
if($n){ Set-Mode 'PlanningPerso' 'Own' }

# SousTaches — mode Own
$n = New-L 'SousTaches' 'Own'
Add-Col 'SousTaches' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'SousTaches' 'DateTache' '<Field Type="DateTime" DisplayName="DateTache" Name="DateTache" StaticName="DateTache" Required="TRUE" Format="DateOnly" />'
Add-Col 'SousTaches' 'TacheId' '<Field Type="Number" DisplayName="TacheId" Name="TacheId" StaticName="TacheId" Required="TRUE"></Field>'
Add-Col 'SousTaches' 'Minutes' '<Field Type="Number" DisplayName="Minutes" Name="Minutes" StaticName="Minutes" Required="TRUE"></Field>'
Add-Col 'SousTaches' 'HeureDebut' '<Field Type="Text" DisplayName="HeureDebut" Name="HeureDebut" StaticName="HeureDebut" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'SousTaches' 'HeureFin' '<Field Type="Text" DisplayName="HeureFin" Name="HeureFin" StaticName="HeureFin" Required="FALSE" MaxLength="255"></Field>'
Add-Col 'SousTaches' 'Source' '<Field Type="Choice" DisplayName="Source" Name="Source" StaticName="Source" Required="FALSE" Format="Dropdown" FillInChoice="FALSE"><Default>Manuel</Default><CHOICES><CHOICE>Chat</CHOICE><CHOICE>Audio</CHOICE><CHOICE>Manuel</CHOICE></CHOICES></Field>'
Add-Col 'SousTaches' 'Message' '<Field Type="Note" DisplayName="Message" Name="Message" StaticName="Message" Required="FALSE" NumLines="6" RichText="FALSE"></Field>'
if($n){ Set-Mode 'SousTaches' 'Own' }

# Livraisons — mode Own
$n = New-L 'Livraisons' 'Own'
Add-Col 'Livraisons' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'Livraisons' 'TacheId' '<Field Type="Number" DisplayName="TacheId" Name="TacheId" StaticName="TacheId" Required="TRUE"></Field>'
Add-Col 'Livraisons' 'Mois' '<Field Type="Text" DisplayName="Mois" Name="Mois" StaticName="Mois" Required="TRUE" MaxLength="255"></Field>'
Add-Col 'Livraisons' 'Statut' '<Field Type="Choice" DisplayName="Statut" Name="Statut" StaticName="Statut" Required="TRUE" Format="Dropdown" FillInChoice="FALSE"><Default>En attente</Default><CHOICES><CHOICE>En attente</CHOICE><CHOICE>Validé</CHOICE><CHOICE>Refusé</CHOICE></CHOICES></Field>'
if($n){ Set-Mode 'Livraisons' 'Own' }

# Absences — mode Own
$n = New-L 'Absences' 'Own'
Add-Col 'Absences' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'Absences' 'Du' '<Field Type="DateTime" DisplayName="Du" Name="Du" StaticName="Du" Required="TRUE" Format="DateOnly" />'
Add-Col 'Absences' 'Au' '<Field Type="DateTime" DisplayName="Au" Name="Au" StaticName="Au" Required="TRUE" Format="DateOnly" />'
Add-Col 'Absences' 'Statut' '<Field Type="Choice" DisplayName="Statut" Name="Statut" StaticName="Statut" Required="TRUE" Format="Dropdown" FillInChoice="FALSE"><Default>En attente</Default><CHOICES><CHOICE>En attente</CHOICE><CHOICE>Acceptée</CHOICE><CHOICE>Refusée</CHOICE></CHOICES></Field>'
if($n){ Set-Mode 'Absences' 'Own' }

# Presence — mode Shared
$n = New-L 'Presence' 'Shared'
Add-Col 'Presence' 'Salarie' '<Field Type="User" DisplayName="Salarie" Name="Salarie" StaticName="Salarie" Required="TRUE" List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" UserSelectionScope="0" />'
Add-Col 'Presence' 'DateJour' '<Field Type="DateTime" DisplayName="DateJour" Name="DateJour" StaticName="DateJour" Required="TRUE" Format="DateOnly" />'
Add-Col 'Presence' 'Statut' '<Field Type="Choice" DisplayName="Statut" Name="Statut" StaticName="Statut" Required="TRUE" Format="Dropdown" FillInChoice="FALSE"><Default>Présent</Default><CHOICES><CHOICE>Présent</CHOICE><CHOICE>Absent</CHOICE><CHOICE>Télétravail</CHOICE></CHOICES></Field>'
if($n){ Set-Mode 'Presence' 'Shared' }

if(-not (Get-PnPList -Identity 'Documents-RH' -ErrorAction SilentlyContinue)){
  New-PnPList -Title 'Documents-RH' -Template DocumentLibrary -OnQuickLaunch | Out-Null
  Set-PnPList -Identity 'Documents-RH' -BreakRoleInheritance
  Set-PnPListPermission -Identity 'Documents-RH' -Group $boss -AddRole $FULL }

# Données de départ (seulement si la liste est vide)
if(-not (Get-PnPListItem -List 'TypesPieces' -PageSize 1)){
  Add-PnPListItem -List 'TypesPieces' -Values @{'Title'='Carte d''identité';'ParDefaut'='Oui'} | Out-Null
  Add-PnPListItem -List 'TypesPieces' -Values @{'Title'='RIB';'ParDefaut'='Oui'} | Out-Null
  Add-PnPListItem -List 'TypesPieces' -Values @{'Title'='Attestation Sécu';'ParDefaut'='Oui'} | Out-Null
  Add-PnPListItem -List 'TypesPieces' -Values @{'Title'='Contrat signé';'ParDefaut'='Oui'} | Out-Null
  Add-PnPListItem -List 'TypesPieces' -Values @{'Title'='Permis de conduire';'ParDefaut'='Non'} | Out-Null
  Add-PnPListItem -List 'TypesPieces' -Values @{'Title'='Diplôme';'ParDefaut'='Non'} | Out-Null
}
if(-not (Get-PnPListItem -List 'Parametres' -PageSize 1)){
  Add-PnPListItem -List 'Parametres' -Values @{'Title'='Couleur';'Valeur'='#1F2A44'} | Out-Null
  Add-PnPListItem -List 'Parametres' -Values @{'Title'='UrlEntreprise';'Valeur'=''} | Out-Null
  Add-PnPListItem -List 'Parametres' -Values @{'Title'='ModeRemunerationDefaut';'Valeur'='Taux horaire'} | Out-Null
  Add-PnPListItem -List 'Parametres' -Values @{'Title'='TauxHoraireDefaut';'Valeur'='15'} | Out-Null
  Add-PnPListItem -List 'Parametres' -Values @{'Title'='ForfaitJourDefaut';'Valeur'='120'} | Out-Null
  Add-PnPListItem -List 'Parametres' -Values @{'Title'='HeuresParJourDefaut';'Valeur'='7'} | Out-Null
}

Write-Host "OK. Ensuite : connectez-vous à Zayado RH, Paramètres › Installer (vérifie et complète),
puis ajoutez vos salariés depuis l'app (contrat, pièces et dossier Documents-RH à droits uniques créés automatiquement)."
