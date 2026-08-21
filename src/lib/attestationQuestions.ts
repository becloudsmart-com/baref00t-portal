/**
 * Procedural-attestation question definitions for the partner-portal
 * run-launch UI (#526 sub-2).
 *
 * ⚠️  PORTAL-LOCAL MIRROR — must stay in sync with the canonical arrays in
 * the platform monorepo at
 * `packages/assessments/src/attestationQuestions.ts` ⇒
 * `PROCEDURAL_QUESTIONS_BY_SLUG`.
 *
 * Why a mirror lives here: this app ships as an OSS / self-hostable
 * partner portal (see "private": false in package.json, the publish-portal
 * workflow, and the public mirror repo at becloudsmart-com/baref00t-portal).
 * Self-hosters install from the published Docker image / package alone —
 * they don't have access to `@baref00t/assessments`, which is monorepo-
 * internal. Duplicating the data keeps the standalone portal buildable
 * without that dep while the canonical source stays single-sourced for
 * every other consumer (the assessment runner and the apps/web partner
 * portal).
 *
 * Only the form-projection (id / controlId / prompt) is mirrored — the
 * report-side helpText and rationale stay in the canonical source.
 */

export interface AttestQ {
  id: string
  controlId: string
  prompt: string
}

/**
 * Mirror of `packages/assessments/src/attestationQuestions.ts` →
 * `PROCEDURAL_QUESTIONS_BY_SLUG`. Update both files together.
 */
export const PRODUCT_ATTESTATIONS: Record<string, AttestQ[]> = {
  e8: [
    { id: 'e8_backup_restore_drills',    controlId: 'E8-BAK-ML1-2', prompt: 'Do you test restore drills at least annually?' },
    { id: 'e8_backup_3_2_1',             controlId: 'E8-BAK-ML2-1', prompt: 'Do you maintain backups following the 3-2-1 rule with at least one immutable/offline copy?' },
    { id: 'e8_backup_access_segregated', controlId: 'E8-BAK-ML2-2', prompt: 'Is backup administration segregated from production administration?' },
    { id: 'e8_backup_quarterly_drills',  controlId: 'E8-BAK-ML3-1', prompt: 'Do you run restore drills at least quarterly with monitored RTO/RPO outcomes?' },
    { id: 'e8_app_control_servers',      controlId: 'E8-APP-ML2-1', prompt: 'Is application control enforced on internet-facing servers?' },
    { id: 'e8_patch_48h',                controlId: 'E8-PAT-ML3-1', prompt: 'Do you apply critical-severity application patches within 48 hours?' },
  ],
  ransomware: [
    { id: 'rw_backup_third_party',   controlId: 'R2-04', prompt: 'Do you have a third-party or Microsoft 365 Backup solution deployed for M365 workloads?' },
    { id: 'rw_backup_immutable',     controlId: 'R2-05', prompt: 'Do your backups use immutability and retention locks?' },
    { id: 'rw_backup_restore_tested', controlId: 'R2-06', prompt: 'Have you tested backup restoration in the last 6 months?' },
    { id: 'rw_asr_deployed',         controlId: 'R3-02', prompt: 'Are Attack Surface Reduction (ASR) or exploit-protection profiles deployed to endpoints?' },
    { id: 'rw_app_control',          controlId: 'R3-03', prompt: 'Is application control (WDAC / AppLocker) deployed in Enforced mode on endpoints?' },
    { id: 'rw_safe_links_attach',    controlId: 'R4-03', prompt: 'Are Safe Links and Safe Attachments enabled across all mailboxes?' },
    { id: 'rw_ir_plan',              controlId: 'R7-04', prompt: 'Do you have a documented ransomware-specific incident response plan?' },
    { id: 'rw_siem_integration',     controlId: 'R7-05', prompt: 'Are Defender / M365 security signals integrated into a SIEM or MDR service?' },
  ],
  'cyber-essentials': [
    { id: 'ce_default_passwords',   controlId: 'SC-04', prompt: 'Have default accounts and passwords been changed or disabled on all in-scope devices?' },
    { id: 'ce_screen_lock',         controlId: 'SC-06', prompt: 'Is an inactivity screen lock (≤ 15 minutes) enforced on all user devices?' },
    { id: 'ce_admin_daily_separate', controlId: 'UA-07', prompt: 'Are administrator accounts separate from daily-use accounts for the same people?' },
    { id: 'ce_access_request',      controlId: 'UA-08', prompt: 'Is there a documented user access request and approval process?' },
    { id: 'ce_web_protection',      controlId: 'MW-05', prompt: 'Is web browsing protection enabled on all devices?' },
    { id: 'ce_app_allowlist',       controlId: 'MW-07', prompt: 'Do you use application whitelisting or sandboxing for downloaded software?' },
    { id: 'ce_patch_14d',           controlId: 'SU-03', prompt: 'Do you apply critical and high-severity patches within 14 days?' },
    { id: 'ce_third_party_updates', controlId: 'SU-06', prompt: 'Do you manage third-party application updates (Chrome, Firefox, Java, Adobe, etc.)?' },
  ],
  mcsb: [
    { id: 'mcsb_ir_plan',    controlId: 'IR-1', prompt: 'Is an incident response plan documented and tested at least annually?' },
    { id: 'mcsb_pv_cadence', controlId: 'PV-3', prompt: 'Is the Defender for Cloud secure-score reviewed at least monthly by the security team?' },
    { id: 'mcsb_pv_sla',     controlId: 'PV-4', prompt: 'Does the security team operate vulnerability remediation SLAs (Critical 24h / High 7d / Medium 30d / Low 90d)?' },
  ],
  'mas-trm': [
    { id: 'mas_board_oversight',   controlId: 'TRG-01',   prompt: 'Does the board and senior management actively oversee technology risk management?' },
    { id: 'mas_trm_framework',     controlId: 'TRG-04',   prompt: 'Is your technology risk management framework documented and approved?' },
    { id: 'mas_risk_id',           controlId: 'TRMF-01',  prompt: 'Do you have a documented technology risk identification and assessment process?' },
    { id: 'mas_risk_appetite',     controlId: 'TRMF-02',  prompt: 'Has your board approved a technology risk appetite statement?' },
    { id: 'mas_secure_design',     controlId: 'ITPM-01',  prompt: 'Are security-by-design practices applied in IT projects?' },
    { id: 'mas_security_testing',  controlId: 'ITPM-02',  prompt: 'Is security testing performed before production deployment?' },
    { id: 'mas_itsm',              controlId: 'ITSM-01',  prompt: 'Are IT service management processes documented (incident, problem, change, release)?' },
    { id: 'mas_change_mgmt',       controlId: 'ITSM-02',  prompt: 'Is a formal change management process used for production systems?' },
    { id: 'mas_dr_plan',           controlId: 'ITR-01',   prompt: 'Is your IT disaster recovery plan documented and tested at least annually?' },
    { id: 'mas_bcp',               controlId: 'ITR-04',   prompt: 'Have you established business continuity planning for critical IT services?' },
    { id: 'mas_key_mgmt',          controlId: 'CRYPT-04', prompt: 'Are cryptographic keys managed via a documented key-management process?' },
    { id: 'mas_pentest',           controlId: 'CSO-04',   prompt: 'Is penetration testing conducted at least annually by an independent provider?' },
    { id: 'mas_soc',               controlId: 'CSO-05',   prompt: 'Do you operate (or contract) a Security Operations Centre with 24x7 monitoring?' },
    { id: 'mas_txn_monitoring',    controlId: 'OFS-02',   prompt: 'Do you have transaction monitoring and fraud detection in place for online financial services?' },
    { id: 'mas_cust_notify',       controlId: 'OFS-03',   prompt: 'Are customers notified for significant transactions or account changes?' },
    { id: 'mas_independent_audit', controlId: 'ITA-02',   prompt: 'Is an independent IT audit conducted at least annually?' },
  ],
  nis2: [
    { id: 'nis2_policy',       controlId: 'A21a-01', prompt: 'Is your information security policy documented and approved by management?' },
    { id: 'nis2_risk_method',  controlId: 'A21a-02', prompt: 'Have you established a documented risk analysis methodology?' },
    { id: 'nis2_ir_24h',       controlId: 'A21b-04', prompt: 'Does your incident response plan meet the NIS2 24-hour early-warning notification requirement?' },
    { id: 'nis2_ir_class',     controlId: 'A21b-05', prompt: 'Do you have a documented incident classification and severity-assessment process?' },
    { id: 'nis2_bcp',          controlId: 'A21c-01', prompt: 'Is your business continuity plan documented and tested?' },
    { id: 'nis2_dr',           controlId: 'A21c-02', prompt: 'Are your disaster recovery procedures documented and tested?' },
    { id: 'nis2_backup_test',  controlId: 'A21c-04', prompt: 'Do you regularly test backup recovery to validate the strategy works?' },
    { id: 'nis2_supply_chain', controlId: 'A21d-04', prompt: 'Do you have a documented supply chain risk-assessment process?' },
    { id: 'nis2_awareness',    controlId: 'A21f-01', prompt: 'Do you run a cybersecurity awareness training program for all staff?' },
    { id: 'nis2_key_mgmt',     controlId: 'A21g-04', prompt: 'Are cryptographic keys managed via a documented key-management process?' },
    { id: 'nis2_screening',    controlId: 'A21h-01', prompt: 'Is pre-employment security screening performed for staff with sensitive access?' },
    { id: 'nis2_jml',          controlId: 'A21h-02', prompt: 'Do you operate a documented joiners / movers / leavers (JML) process for access management?' },
  ],
}

export function getAttestQuestions(slug: string): AttestQ[] {
  return PRODUCT_ATTESTATIONS[slug] ?? []
}
