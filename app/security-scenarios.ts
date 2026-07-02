export type ScenarioCategory = {
  id: string;
  name: string;
  color: string;
};

export type SecurityScenario = {
  id: string;
  title: string;
  categoryId: string;
  objective: string;
  inputs: string[];
  outputs: string[];
  controls: string[];
  riskSignals: string[];
  promptFocus: string;
};

export type ScenarioPromptInput = {
  scenarioId: string;
  organizationContext: string;
  targetScope: string;
  regulation: string;
  evidence: string;
  outputMode: string;
  responseLanguage: string;
};

export const scenarioCategories: ScenarioCategory[] = [
  { id: "detect", name: "Detection and Response", color: "bg-red-500" },
  { id: "vuln", name: "Vulnerability and Hardening", color: "bg-amber-500" },
  { id: "grc", name: "GRC and Audit", color: "bg-teal-600" },
  { id: "policy", name: "Policy and Procedure", color: "bg-stone-700" },
  { id: "risk", name: "Risk and Third Party", color: "bg-cyan-700" },
  { id: "resilience", name: "BIA, BCP, and DR", color: "bg-lime-700" },
  { id: "identity", name: "Identity and Access", color: "bg-indigo-600" },
  { id: "platform", name: "Cloud, Data, and SDLC", color: "bg-emerald-700" },
];

export const scenarios: SecurityScenario[] = [
  {
    id: "suspicious-email",
    title: "Suspicious Email Analysis",
    categoryId: "detect",
    objective: "Classify a reported email and recommend containment steps.",
    inputs: ["Headers", "Body", "URLs", "Attachments", "Sender history"],
    outputs: ["Verdict", "IOCs", "User response", "Containment actions"],
    controls: ["Email security", "Phishing reporting", "Incident triage"],
    riskSignals: ["Lookalike domain", "Credential request", "Urgent payment language"],
    promptFocus:
      "Analyze message artifacts, distinguish phishing from spam or legitimate mail, and produce an evidence-backed handling recommendation.",
  },
  {
    id: "phishing-campaign",
    title: "Phishing Campaign Triage",
    categoryId: "detect",
    objective: "Cluster related reports and decide campaign-level action.",
    inputs: ["Reported messages", "Recipient list", "Mail gateway logs", "Click telemetry"],
    outputs: ["Campaign summary", "Affected users", "Block rules", "Comms draft"],
    controls: ["Security monitoring", "Awareness", "Email gateway"],
    riskSignals: ["Multiple recipients", "Shared lure", "Confirmed credential entry"],
    promptFocus:
      "Group similar reports, estimate blast radius, and create a campaign response plan with clear owner handoffs.",
  },
  {
    id: "malware-attachment",
    title: "Malware Attachment Review",
    categoryId: "detect",
    objective: "Assess an attachment or link before deeper sandboxing.",
    inputs: ["File metadata", "Hash", "Static strings", "Sandbox notes", "URL chain"],
    outputs: ["Malware suspicion", "IOCs", "Safe handling steps", "Escalation path"],
    controls: ["Malware defense", "Endpoint protection", "Forensics"],
    riskSignals: ["Macro behavior", "Archive password", "Unusual process chain"],
    promptFocus:
      "Interpret file and URL indicators without executing content, and define safe next steps for containment and evidence handling.",
  },
  {
    id: "incident-intake",
    title: "Security Incident Intake",
    categoryId: "detect",
    objective: "Turn a raw report into an incident record and initial plan.",
    inputs: ["Reporter notes", "Timeline", "Affected systems", "Known indicators"],
    outputs: ["Severity", "Incident summary", "Open questions", "First-hour actions"],
    controls: ["Incident response", "Escalation", "Evidence preservation"],
    riskSignals: ["Active compromise", "Sensitive data exposure", "Privileged account involved"],
    promptFocus:
      "Normalize ambiguous reports into an actionable incident intake with severity reasoning and immediate response actions.",
  },
  {
    id: "ransomware-response",
    title: "Ransomware Response",
    categoryId: "detect",
    objective: "Build a containment and recovery checklist for suspected ransomware.",
    inputs: ["Symptoms", "Endpoint scope", "Backup state", "Network indicators"],
    outputs: ["Containment checklist", "Recovery sequence", "Leadership brief", "Evidence gaps"],
    controls: ["Incident response", "Backup recovery", "Crisis management"],
    riskSignals: ["File encryption", "Lateral movement", "Backup deletion"],
    promptFocus:
      "Prioritize isolation, evidence preservation, legal notification triggers, and restore decisions under ransomware pressure.",
  },
  {
    id: "data-breach-assessment",
    title: "Data Breach Assessment",
    categoryId: "detect",
    objective: "Assess whether an event may be a notifiable data breach.",
    inputs: ["Data types", "Subjects affected", "Access evidence", "Jurisdictions", "Timeline"],
    outputs: ["Breach likelihood", "Notification triggers", "Decision log", "Counsel questions"],
    controls: ["Privacy incident response", "Data inventory", "Legal escalation"],
    riskSignals: ["Personal data", "Regulated data", "External disclosure"],
    promptFocus:
      "Separate facts from assumptions, identify notification criteria, and define legal and privacy review actions.",
  },
  {
    id: "dlp-alert",
    title: "DLP Alert Triage",
    categoryId: "detect",
    objective: "Review a data loss prevention alert for business context and risk.",
    inputs: ["DLP event", "Data labels", "Destination", "User role", "Business justification"],
    outputs: ["Risk rating", "False positive view", "User follow-up", "Control tuning"],
    controls: ["DLP", "Data classification", "Insider risk"],
    riskSignals: ["External domain", "Bulk transfer", "Source code or regulated data"],
    promptFocus:
      "Determine whether the transfer is legitimate, risky, or policy-violating, with proportionate follow-up actions.",
  },
  {
    id: "siem-alert-tuning",
    title: "SIEM Alert Tuning",
    categoryId: "detect",
    objective: "Improve noisy detection rules without losing material coverage.",
    inputs: ["Alert logic", "Recent hits", "False positive examples", "Target behavior"],
    outputs: ["Tuning proposal", "Suppression logic", "Residual risk", "Test cases"],
    controls: ["Security monitoring", "Detection engineering", "Logging"],
    riskSignals: ["High noise", "Broad exclusions", "No validation set"],
    promptFocus:
      "Tune detection logic with measurable before and after criteria, preserving high-risk signals.",
  },
  {
    id: "threat-hunt",
    title: "Threat Hunt Hypothesis",
    categoryId: "detect",
    objective: "Design a threat hunt from weak signals or threat intelligence.",
    inputs: ["Hypothesis", "Threat intel", "Available logs", "Environment scope"],
    outputs: ["Hunt plan", "Queries", "Expected findings", "Escalation criteria"],
    controls: ["Threat hunting", "Logging", "Detection coverage"],
    riskSignals: ["Known TTP", "Coverage gap", "Recent exposure"],
    promptFocus:
      "Translate threat intelligence into environment-specific hunt steps, data needs, and decision points.",
  },
  {
    id: "vulnerability-prioritization",
    title: "Vulnerability Prioritization",
    categoryId: "vuln",
    objective: "Prioritize vulnerabilities by exploitability and business exposure.",
    inputs: ["Scanner findings", "Asset criticality", "Exploit status", "Internet exposure"],
    outputs: ["Priority queue", "Patch SLA", "Compensating controls", "Exceptions"],
    controls: ["Vulnerability management", "Asset management", "Patch management"],
    riskSignals: ["Known exploited", "Public service", "Privileged system"],
    promptFocus:
      "Convert raw vulnerability results into a risk-ranked remediation plan with accountable actions.",
  },
  {
    id: "patch-exception",
    title: "Patch Exception Review",
    categoryId: "vuln",
    objective: "Evaluate whether a patch exception is justified and controlled.",
    inputs: ["Exception request", "System role", "Vulnerability detail", "Mitigations", "Expiry"],
    outputs: ["Approval recommendation", "Conditions", "Residual risk", "Review date"],
    controls: ["Patch management", "Risk acceptance", "Change management"],
    riskSignals: ["Long exception", "No compensating control", "External exposure"],
    promptFocus:
      "Assess exception quality, required compensating controls, and time-bound acceptance language.",
  },
  {
    id: "pentest-remediation",
    title: "Pen Test Remediation Plan",
    categoryId: "vuln",
    objective: "Turn penetration test findings into a tracked remediation plan.",
    inputs: ["Finding", "Evidence", "Business owner", "Affected systems", "Constraints"],
    outputs: ["Root cause", "Fix plan", "Verification steps", "Owner matrix"],
    controls: ["Penetration testing", "Remediation tracking", "Secure configuration"],
    riskSignals: ["Credential exposure", "Auth bypass", "Repeat finding"],
    promptFocus:
      "Convert technical findings into clear business risk, remediation tasks, and validation evidence.",
  },
  {
    id: "pentest-report-writer",
    title: "Pen Test Report Draft and Summary",
    categoryId: "vuln",
    objective:
      "Turn raw test notes or partial report text into polished penetration test report sections and summaries.",
    inputs: [
      "Scope",
      "Methodology",
      "Draft report text",
      "Findings",
      "Evidence",
      "Affected assets",
      "Retest notes",
    ],
    outputs: [
      "Executive summary",
      "Management summary",
      "Methodology wording",
      "Finding narrative",
      "Recommendations",
      "Appendices",
    ],
    controls: ["Penetration testing", "Vulnerability management", "Executive reporting"],
    riskSignals: [
      "Unclear scope",
      "Missing evidence",
      "Overstated exploitability",
      "Unbalanced executive wording",
    ],
    promptFocus:
      "Help draft a professional penetration test report from notes or draft text. Create concise executive and management summaries, rewrite finding narratives, preserve technical accuracy, and avoid unsupported risk claims.",
  },
  {
    id: "pentest-report-review",
    title: "Pen Test Report Language Review",
    categoryId: "vuln",
    objective:
      "Review penetration test report language for clarity, professionalism, defensibility, and executive readability.",
    inputs: [
      "Draft report text",
      "Scope statement",
      "Finding evidence",
      "Severity rubric",
      "Target audience",
      "Client constraints",
    ],
    outputs: [
      "Language review notes",
      "Before and after rewrites",
      "Executive summary edits",
      "Severity wording checks",
      "Missing evidence",
      "Disclosure cautions",
    ],
    controls: ["Penetration testing", "Quality assurance", "Risk communication"],
    riskSignals: [
      "Unsupported severity",
      "Ambiguous remediation",
      "Sensitive disclosure",
      "Overly alarmist wording",
    ],
    promptFocus:
      "Review report wording without changing unsupported facts. Improve tone, grammar, structure, executive readability, severity consistency, remediation clarity, and safe disclosure wording. Provide concise summary options when requested.",
  },
  {
    id: "hardening-baseline",
    title: "Endpoint Hardening Baseline",
    categoryId: "vuln",
    objective: "Review endpoint configuration against a hardening baseline.",
    inputs: ["Baseline", "Current settings", "Endpoint role", "Exceptions"],
    outputs: ["Gap list", "Hardening actions", "Operational impact", "Rollout plan"],
    controls: ["Secure configuration", "Endpoint security", "Change management"],
    riskSignals: ["Local admin", "Disabled protection", "Legacy protocol"],
    promptFocus:
      "Identify hardening gaps and produce a pragmatic rollout plan that accounts for business disruption.",
  },
  {
    id: "firewall-rule-review",
    title: "Firewall Rule Review",
    categoryId: "vuln",
    objective: "Assess network rules for excessive exposure and stale access.",
    inputs: ["Rule export", "Business justification", "Traffic logs", "Owner"],
    outputs: ["Risky rules", "Cleanup plan", "Owner questions", "Validation tests"],
    controls: ["Network security", "Segmentation", "Change control"],
    riskSignals: ["Any-any", "Unused rule", "Admin port exposed"],
    promptFocus:
      "Review rules for least privilege, ownership, business need, and safe removal or tightening.",
  },
  {
    id: "segmentation-review",
    title: "Network Segmentation Review",
    categoryId: "vuln",
    objective: "Check whether network zones enforce required isolation.",
    inputs: ["Network diagram", "Traffic flows", "Asset groups", "Control requirements"],
    outputs: ["Segmentation gaps", "Allowed flows", "Control tests", "Remediation roadmap"],
    controls: ["Network segmentation", "Zero trust", "Access control"],
    riskSignals: ["Flat network", "Sensitive zone access", "Unmonitored east-west traffic"],
    promptFocus:
      "Compare required and actual connectivity, then define segmentation changes and test evidence.",
  },
  {
    id: "audit-regulation",
    title: "Regulation Audit",
    categoryId: "grc",
    objective: "Assess control readiness against a named regulation or framework.",
    inputs: ["Regulation", "Scope", "Control list", "Evidence", "Process owners"],
    outputs: ["Control status", "Evidence gaps", "Remediation plan", "Audit questions"],
    controls: ["Compliance management", "Control testing", "Evidence management"],
    riskSignals: ["Missing owner", "No operating evidence", "Out-of-scope assumption"],
    promptFocus:
      "Map evidence to requirements, identify gaps, and produce an auditor-ready action plan.",
  },
  {
    id: "control-gap",
    title: "Control Gap Assessment",
    categoryId: "grc",
    objective: "Compare current controls to target maturity or framework needs.",
    inputs: ["Target framework", "Current process", "Evidence", "Maturity target"],
    outputs: ["Gap matrix", "Risk impact", "Quick wins", "Roadmap"],
    controls: ["Control framework", "Risk treatment", "Program maturity"],
    riskSignals: ["Manual control", "No evidence", "Undefined accountability"],
    promptFocus:
      "Create a clear gap matrix with maturity impact, priority, and realistic remediation sequencing.",
  },
  {
    id: "evidence-request",
    title: "Audit Evidence Request List",
    categoryId: "grc",
    objective: "Prepare a precise evidence request list for an audit scope.",
    inputs: ["Audit scope", "Framework", "Systems", "Period", "Control owners"],
    outputs: ["Evidence list", "Owner map", "Sampling notes", "Due dates"],
    controls: ["Audit management", "Evidence collection", "Control ownership"],
    riskSignals: ["Ambiguous request", "Unavailable logs", "Unassigned owner"],
    promptFocus:
      "Generate evidence requests that are specific, testable, period-bound, and mapped to owners.",
  },
  {
    id: "control-test-script",
    title: "Control Test Script",
    categoryId: "grc",
    objective: "Create repeatable test steps for a control.",
    inputs: ["Control statement", "Frequency", "Population", "Evidence source", "Criteria"],
    outputs: ["Test procedure", "Sample approach", "Pass criteria", "Exception handling"],
    controls: ["Internal audit", "Control testing", "Quality review"],
    riskSignals: ["Undefined population", "No pass criteria", "Subjective test"],
    promptFocus:
      "Write objective test steps that produce reusable audit evidence and defensible conclusions.",
  },
  {
    id: "regulatory-crosswalk",
    title: "Regulatory Crosswalk",
    categoryId: "grc",
    objective: "Map controls or policies across multiple frameworks.",
    inputs: ["Source framework", "Target framework", "Control text", "Scope notes"],
    outputs: ["Mapping table", "Coverage level", "Partial gaps", "Reuse opportunities"],
    controls: ["Compliance mapping", "Policy governance", "Control library"],
    riskSignals: ["False equivalence", "Partial coverage", "Jurisdiction mismatch"],
    promptFocus:
      "Create a conservative crosswalk that marks exact, partial, and missing coverage with rationale.",
  },
  {
    id: "metrics-kri",
    title: "Security Metrics and KRI Brief",
    categoryId: "grc",
    objective: "Turn operational data into an executive security report.",
    inputs: ["Metrics", "Trend period", "Targets", "Material incidents", "Board priorities"],
    outputs: ["Executive brief", "KRI table", "Trend commentary", "Decisions needed"],
    controls: ["Governance reporting", "Risk appetite", "Program oversight"],
    riskSignals: ["Worsening trend", "Threshold breach", "Unowned risk"],
    promptFocus:
      "Summarize security posture in decision-ready language, separating signal from activity counts.",
  },
  {
    id: "policy-review",
    title: "Policy Review",
    categoryId: "policy",
    objective: "Review a policy for clarity, control coverage, and enforceability.",
    inputs: ["Policy text", "Target framework", "Audience", "Exceptions", "Approval history"],
    outputs: ["Issues", "Improved clauses", "Missing controls", "Approval notes"],
    controls: ["Policy governance", "Compliance", "Security awareness"],
    riskSignals: ["Ambiguous requirement", "No owner", "Unmeasurable wording"],
    promptFocus:
      "Critique policy text for enforceable requirements, scope clarity, missing roles, and auditability.",
  },
  {
    id: "policy-creation",
    title: "Policy Creation",
    categoryId: "policy",
    objective: "Draft a security policy from requirements and operating context.",
    inputs: ["Policy purpose", "Scope", "Regulation", "Existing standards", "Approval body"],
    outputs: ["Policy draft", "Roles", "Exceptions", "Review cadence"],
    controls: ["Policy governance", "Compliance", "Risk management"],
    riskSignals: ["Overly broad scope", "No exception path", "No enforcement owner"],
    promptFocus:
      "Draft policy content with clear scope, obligations, ownership, exceptions, and review requirements.",
  },
  {
    id: "procedure-creation",
    title: "Procedure Creation",
    categoryId: "policy",
    objective: "Create a step-by-step operating procedure for a security process.",
    inputs: ["Process objective", "Trigger", "Roles", "Tools", "Evidence required"],
    outputs: ["Procedure", "RACI", "Checklist", "Records generated"],
    controls: ["Operational procedure", "Control execution", "Evidence retention"],
    riskSignals: ["Unclear trigger", "No handoff", "No record of completion"],
    promptFocus:
      "Write an executable procedure with roles, prerequisites, decision points, outputs, and evidence capture.",
  },
  {
    id: "standard-baseline",
    title: "Security Standard Baseline",
    categoryId: "policy",
    objective: "Create a technical standard that supports a higher-level policy.",
    inputs: ["Policy requirement", "Technology scope", "Minimum settings", "Exceptions"],
    outputs: ["Standard", "Configuration requirements", "Validation method", "Exception rules"],
    controls: ["Security standards", "Configuration management", "Compliance"],
    riskSignals: ["Unverifiable setting", "Legacy incompatibility", "No baseline owner"],
    promptFocus:
      "Translate policy obligations into measurable technical requirements and validation methods.",
  },
  {
    id: "playbook-creation",
    title: "Response Playbook Creation",
    categoryId: "policy",
    objective: "Build a playbook for a repeatable security event.",
    inputs: ["Event type", "Detection source", "Roles", "Tools", "Escalation thresholds"],
    outputs: ["Playbook", "Decision tree", "Communication points", "Closeout criteria"],
    controls: ["Incident response", "SOC operations", "Knowledge management"],
    riskSignals: ["No escalation criteria", "Unclear containment authority", "Missing evidence step"],
    promptFocus:
      "Create a concise playbook with trigger criteria, decision points, containment steps, and closure checks.",
  },
  {
    id: "risk-assessment",
    title: "Security Risk Assessment",
    categoryId: "risk",
    objective: "Assess a security risk and recommend treatment.",
    inputs: ["Risk statement", "Threats", "Vulnerabilities", "Business impact", "Controls"],
    outputs: ["Likelihood", "Impact", "Residual risk", "Treatment plan"],
    controls: ["Risk management", "Control assessment", "Risk acceptance"],
    riskSignals: ["High impact", "Weak controls", "No risk owner"],
    promptFocus:
      "Turn a risk narrative into a structured assessment with assumptions, scoring, and treatment options.",
  },
  {
    id: "risk-acceptance",
    title: "Risk Acceptance Review",
    categoryId: "risk",
    objective: "Evaluate a request to accept residual security risk.",
    inputs: ["Risk description", "Compensating controls", "Duration", "Owner", "Business rationale"],
    outputs: ["Recommendation", "Acceptance conditions", "Residual exposure", "Review date"],
    controls: ["Risk acceptance", "Governance", "Exception management"],
    riskSignals: ["No expiry", "No accountable executive", "Repeated extension"],
    promptFocus:
      "Assess whether acceptance is time-bound, accountable, informed, and supported by compensating controls.",
  },
  {
    id: "vendor-risk",
    title: "Vendor Risk Review",
    categoryId: "risk",
    objective: "Evaluate a supplier or SaaS provider for security risk.",
    inputs: ["Questionnaire", "SOC report", "Data processed", "Access model", "Contract terms"],
    outputs: ["Risk rating", "Follow-up questions", "Contract clauses", "Monitoring plan"],
    controls: ["Third-party risk", "Contract security", "Data protection"],
    riskSignals: ["Sensitive data", "Subprocessors", "Weak incident notice"],
    promptFocus:
      "Review vendor evidence, identify material gaps, and produce procurement-ready risk advice.",
  },
  {
    id: "contract-security",
    title: "Contract Security Review",
    categoryId: "risk",
    objective: "Review security and privacy terms in a supplier contract.",
    inputs: ["Contract clauses", "Data flows", "Service criticality", "Regulatory needs"],
    outputs: ["Clause gaps", "Negotiation points", "Risk language", "Fallback controls"],
    controls: ["Third-party risk", "Legal review", "Privacy"],
    riskSignals: ["Weak audit rights", "No breach notice period", "Unbounded subprocessors"],
    promptFocus:
      "Identify missing or weak security obligations and draft practical negotiation points for counsel.",
  },
  {
    id: "ma-due-diligence",
    title: "M&A Security Due Diligence",
    categoryId: "risk",
    objective: "Assess acquisition or merger security risks before integration.",
    inputs: ["Target profile", "Security artifacts", "Incidents", "Tech stack", "Integration plan"],
    outputs: ["Risk memo", "Priority diligence questions", "Day-1 controls", "Integration risks"],
    controls: ["Due diligence", "Risk assessment", "Integration governance"],
    riskSignals: ["Unknown incidents", "Unsupported systems", "Privileged access gaps"],
    promptFocus:
      "Frame material cyber risks for transaction decisions and post-close integration planning.",
  },
  {
    id: "bia",
    title: "Business Impact Analysis",
    categoryId: "resilience",
    objective: "Identify critical processes, impacts, and recovery targets.",
    inputs: ["Business process", "Dependencies", "Impact categories", "Peak periods", "Manual workarounds"],
    outputs: ["Impact summary", "RTO/RPO", "Critical dependencies", "Recovery priorities"],
    controls: ["Business continuity", "Dependency management", "Resilience"],
    riskSignals: ["No workaround", "Single point of failure", "Regulatory deadline"],
    promptFocus:
      "Create a BIA with impact tiers, recovery objectives, dependencies, and validation questions.",
  },
  {
    id: "bcp-plan",
    title: "Business Continuity Plan",
    categoryId: "resilience",
    objective: "Build or review a continuity plan for a business service.",
    inputs: ["Service scope", "BIA results", "Teams", "Dependencies", "Communication needs"],
    outputs: ["BCP outline", "Activation triggers", "Team actions", "Recovery checklist"],
    controls: ["Business continuity", "Crisis management", "Operational resilience"],
    riskSignals: ["Unclear activation", "No alternate process", "Untested contact tree"],
    promptFocus:
      "Define continuity actions, triggers, roles, dependencies, and evidence for plan maintenance.",
  },
  {
    id: "dr-tabletop",
    title: "DR Tabletop Exercise",
    categoryId: "resilience",
    objective: "Design a tabletop exercise for disaster recovery capability.",
    inputs: ["Scenario", "Systems", "Participants", "Recovery targets", "Known weaknesses"],
    outputs: ["Exercise script", "Injects", "Success criteria", "After-action report template"],
    controls: ["Disaster recovery", "Testing", "Crisis management"],
    riskSignals: ["Unproven restore", "No escalation route", "Unclear decision authority"],
    promptFocus:
      "Create a realistic DR exercise that tests recovery objectives, decision making, and evidence capture.",
  },
  {
    id: "backup-resilience",
    title: "Backup Resilience Review",
    categoryId: "resilience",
    objective: "Assess whether backup controls support recovery from cyber events.",
    inputs: ["Backup architecture", "Restore tests", "Retention", "Admin access", "Immutable copies"],
    outputs: ["Resilience gaps", "Restore risk", "Hardening actions", "Test plan"],
    controls: ["Backup", "Disaster recovery", "Ransomware resilience"],
    riskSignals: ["No immutable backup", "Untested restore", "Shared admin credentials"],
    promptFocus:
      "Evaluate backup survivability, restore confidence, access separation, and test coverage.",
  },
  {
    id: "access-review",
    title: "User Access Review",
    categoryId: "identity",
    objective: "Review user access for appropriateness and evidence quality.",
    inputs: ["Access export", "Roles", "Manager attestations", "Sensitive privileges"],
    outputs: ["Review findings", "Revocation list", "Evidence gaps", "Control improvements"],
    controls: ["Access review", "Least privilege", "Joiner-mover-leaver"],
    riskSignals: ["Dormant account", "Excessive privilege", "No manager approval"],
    promptFocus:
      "Identify access anomalies, evidence gaps, and changes needed to make the review auditable.",
  },
  {
    id: "privileged-access",
    title: "Privileged Access Review",
    categoryId: "identity",
    objective: "Assess privileged access against least privilege and accountability.",
    inputs: ["Privileged accounts", "Role justification", "PAM logs", "Break-glass process"],
    outputs: ["High-risk access", "Revocations", "PAM gaps", "Monitoring actions"],
    controls: ["Privileged access management", "Logging", "Segregation of duties"],
    riskSignals: ["Shared admin", "No MFA", "Standing privilege"],
    promptFocus:
      "Evaluate privileged access risks and produce specific removals, controls, and monitoring steps.",
  },
  {
    id: "jml-control",
    title: "Joiner-Mover-Leaver Test",
    categoryId: "identity",
    objective: "Test whether access changes follow HR and approval events.",
    inputs: ["HR records", "Access tickets", "System logs", "Policy SLA", "Sample period"],
    outputs: ["Test results", "Exceptions", "Root cause", "Remediation actions"],
    controls: ["Identity lifecycle", "Access provisioning", "Termination control"],
    riskSignals: ["Late removal", "No approval", "Manual bypass"],
    promptFocus:
      "Design and evaluate JML testing with clear populations, samples, pass criteria, and exceptions.",
  },
  {
    id: "cloud-config",
    title: "Cloud Configuration Review",
    categoryId: "platform",
    objective: "Review cloud settings for exposure, misconfiguration, and control gaps.",
    inputs: ["Cloud findings", "Account scope", "Data types", "Network exposure", "IAM model"],
    outputs: ["Prioritized gaps", "Fix plan", "Compensating controls", "Validation steps"],
    controls: ["Cloud security", "IAM", "Secure configuration"],
    riskSignals: ["Public storage", "Overbroad role", "No logging"],
    promptFocus:
      "Prioritize cloud misconfigurations by exposure and data sensitivity, then propose verifiable fixes.",
  },
  {
    id: "saas-security",
    title: "SaaS Security Review",
    categoryId: "platform",
    objective: "Review SaaS application settings and administrative controls.",
    inputs: ["SaaS app", "User roles", "SSO/MFA settings", "Sharing controls", "Audit logs"],
    outputs: ["Configuration gaps", "Admin actions", "Monitoring needs", "User impact"],
    controls: ["SaaS governance", "Identity", "Data protection"],
    riskSignals: ["External sharing", "Local passwords", "Weak admin controls"],
    promptFocus:
      "Assess SaaS settings for identity, sharing, data exposure, logging, and administrative risk.",
  },
  {
    id: "data-classification",
    title: "Data Classification Review",
    categoryId: "platform",
    objective: "Classify data and recommend handling requirements.",
    inputs: ["Data sample", "Business process", "Regulatory context", "Recipients", "Storage location"],
    outputs: ["Classification", "Handling rules", "Retention notes", "Control gaps"],
    controls: ["Data classification", "Privacy", "Information handling"],
    riskSignals: ["Personal data", "Financial data", "Public sharing"],
    promptFocus:
      "Classify data conservatively and link classification to handling, storage, transfer, and retention controls.",
  },
  {
    id: "dpia",
    title: "Privacy Impact Assessment",
    categoryId: "platform",
    objective: "Assess privacy risks for a process or system.",
    inputs: ["Processing purpose", "Data subjects", "Data categories", "Vendors", "Transfers"],
    outputs: ["Privacy risks", "Mitigations", "DPIA questions", "Decision log"],
    controls: ["Privacy governance", "Data protection", "Third-party risk"],
    riskSignals: ["Sensitive data", "Automated decision", "Cross-border transfer"],
    promptFocus:
      "Identify privacy risk, required questions, and mitigation actions for a DPIA-style review.",
  },
  {
    id: "secure-sdlc-threat-model",
    title: "Secure SDLC Threat Model",
    categoryId: "platform",
    objective: "Create a threat model for an application or change.",
    inputs: ["Architecture", "Data flows", "Trust boundaries", "Auth model", "Dependencies"],
    outputs: ["Threats", "Abuse cases", "Controls", "Security requirements"],
    controls: ["Secure SDLC", "Threat modeling", "Application security"],
    riskSignals: ["New trust boundary", "Sensitive data", "External integration"],
    promptFocus:
      "Analyze application design for threats, abuse cases, missing controls, and testable security requirements.",
  },
  {
    id: "change-security-review",
    title: "Change Security Review",
    categoryId: "platform",
    objective: "Assess a planned technology change for security impact.",
    inputs: ["Change summary", "Architecture impact", "Data impact", "Rollback plan", "Approvals"],
    outputs: ["Security impact", "Required controls", "Go/no-go risks", "Validation checks"],
    controls: ["Change management", "Secure configuration", "Risk management"],
    riskSignals: ["Internet exposure", "Privilege change", "No rollback"],
    promptFocus:
      "Evaluate security implications of a change and produce clear conditions for approval.",
  },
  {
    id: "ai-system-review",
    title: "AI System Security Review",
    categoryId: "platform",
    objective: "Assess security and governance risks in an AI-enabled system.",
    inputs: ["Use case", "Model/provider", "Data inputs", "User groups", "Integrations"],
    outputs: ["AI risk register", "Controls", "Testing plan", "Policy requirements"],
    controls: ["AI governance", "Data protection", "Application security"],
    riskSignals: ["Sensitive prompts", "Tool access", "Unreviewed outputs"],
    promptFocus:
      "Review AI-specific risks including data leakage, prompt injection, output reliance, access control, and monitoring.",
  },
  {
    id: "security-awareness",
    title: "Security Awareness Campaign",
    categoryId: "grc",
    objective: "Plan awareness content for a targeted security behavior.",
    inputs: ["Audience", "Behavior goal", "Recent incidents", "Policy requirements", "Timing"],
    outputs: ["Campaign plan", "Message themes", "Quiz questions", "Measurement plan"],
    controls: ["Awareness training", "Policy communication", "Human risk"],
    riskSignals: ["Repeat behavior", "Low reporting", "High-risk group"],
    promptFocus:
      "Create targeted awareness material tied to observed risks, desired behavior, and measurable outcomes.",
  },
  {
    id: "log-source-onboarding",
    title: "Log Source Onboarding",
    categoryId: "detect",
    objective: "Define logging requirements and onboarding steps for a system.",
    inputs: ["System type", "Critical events", "Current logs", "Retention needs", "SIEM format"],
    outputs: ["Log requirements", "Parser needs", "Detection use cases", "Acceptance tests"],
    controls: ["Logging", "Monitoring", "Detection engineering"],
    riskSignals: ["No auth logs", "Short retention", "Unparsed fields"],
    promptFocus:
      "Define useful security logging, retention, parsing, and detection acceptance criteria for onboarding.",
  },
  {
    id: "asset-criticality",
    title: "Asset Criticality Scoring",
    categoryId: "risk",
    objective: "Score asset criticality for risk and remediation prioritization.",
    inputs: ["Asset inventory", "Business process", "Data classification", "Exposure", "Dependencies"],
    outputs: ["Criticality score", "Rationale", "Tiering", "Inventory fixes"],
    controls: ["Asset management", "Risk management", "Vulnerability management"],
    riskSignals: ["Unknown owner", "Sensitive data", "External dependency"],
    promptFocus:
      "Score asset criticality using business impact, data sensitivity, exposure, and dependency factors.",
  },
  {
    id: "ot-iot-assessment",
    title: "OT and IoT Security Assessment",
    categoryId: "platform",
    objective: "Assess connected operational technology or IoT environments.",
    inputs: ["Device inventory", "Network zones", "Remote access", "Patch constraints", "Safety impact"],
    outputs: ["Risk findings", "Segmentation actions", "Monitoring needs", "Compensating controls"],
    controls: ["OT security", "Network segmentation", "Remote access"],
    riskSignals: ["Unsupported firmware", "Flat network", "Vendor remote access"],
    promptFocus:
      "Assess OT and IoT risk with safety, availability, segmentation, and compensating control constraints.",
  },
];

export const defaultScenarioId = "suspicious-email";

export function getScenarioById(id: string): SecurityScenario {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0];
}

export function buildScenarioPrompt(input: ScenarioPromptInput): string {
  const scenario = getScenarioById(input.scenarioId);
  const regulation = input.regulation.trim() || "Not specified";
  const targetScope = input.targetScope.trim() || "Not specified";
  const organizationContext = input.organizationContext.trim() || "Not specified";
  const evidence = input.evidence.trim() || "No evidence provided";
  const responseLanguage = input.responseLanguage.trim() || "English";

  return [
    `Scenario: ${scenario.title}`,
    `Objective: ${scenario.objective}`,
    `Requested output mode: ${input.outputMode}`,
    `Output mode guidance: ${getOutputModeGuidance(input.outputMode)}`,
    `Response language: ${responseLanguage}`,
    `Organization context: ${organizationContext}`,
    `Target scope: ${targetScope}`,
    `Regulation or framework: ${regulation}`,
    "",
    "Scenario focus:",
    scenario.promptFocus,
    "",
    "Expected inputs for this scenario:",
    scenario.inputs.map((item) => `- ${item}`).join("\n"),
    "",
    "Requested deliverables:",
    scenario.outputs.map((item) => `- ${item}`).join("\n"),
    "",
    "Known risk signals to consider:",
    scenario.riskSignals.map((item) => `- ${item}`).join("\n"),
    "",
    "Evidence or request text:",
    evidence,
    "",
    "Produce a practical security department work product. Use this structure:",
    "1. Executive summary",
    "2. Facts observed",
    "3. Assumptions and evidence gaps",
    "4. Risk and control analysis",
    "5. Recommended actions with priority and owner",
    "6. Questions for the requester or control owner",
    "7. Draft artifact or checklist where relevant",
    "",
    "Do not invent facts. Mark uncertainty clearly. Keep legal, regulatory, and HR-sensitive conclusions as recommendations for qualified review.",
  ].join("\n");
}

function getOutputModeGuidance(outputMode: string): string {
  if (outputMode === "Executive Summary") {
    return "Produce a concise leadership-ready summary with material risk, business impact, top findings, key evidence caveats, and prioritized next steps.";
  }
  if (outputMode === "Language Review") {
    return "Review and improve wording. Provide concise critique, before-and-after rewrites where useful, tone improvements, unsupported claim warnings, and clearer summary language.";
  }
  if (outputMode === "Pen Test Report") {
    return "Produce penetration test report-ready content with scope, methodology, executive summary, finding narratives, severity rationale, remediation guidance, and evidence caveats.";
  }
  return "Use the requested work-product style and keep the response practical, structured, and evidence-led.";
}
