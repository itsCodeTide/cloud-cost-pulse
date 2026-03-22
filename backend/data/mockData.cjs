'use strict';

const mockAnalyses = [
  { id: 'ana_001', name: 'Q4 2024 AWS Infrastructure Review', provider: 'aws', status: 'completed', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), totalMonthlyCost: 84320, wasteAmount: 18940, wastePercentage: 22.5, savingsOpportunity: 26800, resources: 342, region: 'us-east-1', account: 'prod-account-001' },
  { id: 'ana_002', name: 'Azure Dev Environment Audit', provider: 'azure', status: 'completed', createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), totalMonthlyCost: 32100, wasteAmount: 12840, wastePercentage: 40.0, savingsOpportunity: 15200, resources: 128, region: 'eastus', account: 'dev-subscription' },
  { id: 'ana_003', name: 'GCP Data Platform Analysis', provider: 'gcp', status: 'completed', createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), totalMonthlyCost: 21500, wasteAmount: 4300, wastePercentage: 20.0, savingsOpportunity: 8900, resources: 89, region: 'us-central1', account: 'data-project-prod' },
];

const mockResources = [
  { id: 'r01', analysisId: 'ana_001', type: 'EC2 Instance', name: 'web-server-prod-01', region: 'us-east-1', monthlyCost: 842, waste: true, wasteReason: 'CPU avg < 3% for 30 days', utilizationScore: 8, rightsizingSaving: 421, category: 'Compute' },
  { id: 'r02', analysisId: 'ana_001', type: 'EC2 Instance', name: 'web-server-prod-02', region: 'us-east-1', monthlyCost: 842, waste: true, wasteReason: 'CPU avg < 3% for 30 days', utilizationScore: 9, rightsizingSaving: 421, category: 'Compute' },
  { id: 'r03', analysisId: 'ana_001', type: 'RDS Instance', name: 'db-primary-prod', region: 'us-east-1', monthlyCost: 2100, waste: false, wasteReason: null, utilizationScore: 78, rightsizingSaving: 0, category: 'Database' },
  { id: 'r04', analysisId: 'ana_001', type: 'EBS Volume', name: 'vol-unattached-003', region: 'us-east-1', monthlyCost: 38, waste: true, wasteReason: 'Unattached for 45 days', utilizationScore: 0, rightsizingSaving: 38, category: 'Storage' },
  { id: 'r05', analysisId: 'ana_001', type: 'Load Balancer', name: 'alb-prod-main', region: 'us-east-1', monthlyCost: 320, waste: false, wasteReason: null, utilizationScore: 65, rightsizingSaving: 0, category: 'Network' },
  { id: 'r06', analysisId: 'ana_001', type: 'S3 Bucket', name: 'logs-archive-2022', region: 'us-east-1', monthlyCost: 890, waste: true, wasteReason: 'No lifecycle policy, 4TB unaccessed', utilizationScore: 5, rightsizingSaving: 750, category: 'Storage' },
  { id: 'r07', analysisId: 'ana_001', type: 'ElastiCache', name: 'redis-session-cache', region: 'us-east-1', monthlyCost: 680, waste: false, wasteReason: null, utilizationScore: 52, rightsizingSaving: 340, category: 'Cache' },
  { id: 'r08', analysisId: 'ana_001', type: 'Lambda Function', name: 'process-orders-fn', region: 'us-east-1', monthlyCost: 42, waste: false, wasteReason: null, utilizationScore: 88, rightsizingSaving: 0, category: 'Serverless' },
  { id: 'r09', analysisId: 'ana_001', type: 'NAT Gateway', name: 'nat-gw-prod-az1', region: 'us-east-1', monthlyCost: 450, waste: true, wasteReason: 'Redundant, low traffic', utilizationScore: 12, rightsizingSaving: 225, category: 'Network' },
  { id: 'r10', analysisId: 'ana_001', type: 'CloudWatch Logs', name: 'api-gateway-logs', region: 'us-east-1', monthlyCost: 210, waste: true, wasteReason: 'No retention policy, 800GB old logs', utilizationScore: 20, rightsizingSaving: 168, category: 'Monitoring' },
  { id: 'r11', analysisId: 'ana_001', type: 'EBS Snapshot', name: 'db-snapshots-old', region: 'us-east-1', monthlyCost: 340, waste: true, wasteReason: '482 snapshots older than 90 days', utilizationScore: 0, rightsizingSaving: 340, category: 'Storage' },
  { id: 'r12', analysisId: 'ana_001', type: 'EC2 Instance', name: 'bastion-host', region: 'us-east-1', monthlyCost: 124, waste: false, wasteReason: null, utilizationScore: 15, rightsizingSaving: 62, category: 'Compute' },
];

const mockRecommendations = [
  { id: 'rec_001', analysisId: 'ana_001', title: 'Right-size oversized EC2 instances', category: 'Rightsizing', provider: 'aws', effort: 'Low', impact: 'High', annualSavings: 18240, monthlySavings: 1520, description: '23 EC2 instances running at below 15% average CPU utilization over 30 days. Downgrading to next smaller instance type maintains performance while reducing cost by 50%.', affectedResources: 23, implementation: 'Use AWS Compute Optimizer. Schedule during maintenance window. Test with 1 instance first, then roll out.', priority: 1, status: 'pending', tags: ['compute', 'quick-win'] },
  { id: 'rec_002', analysisId: 'ana_001', title: 'Purchase Reserved Instances for baseline workloads', category: 'Reserved', provider: 'aws', effort: 'Medium', impact: 'Very High', annualSavings: 42600, monthlySavings: 3550, description: '8 EC2 instances have run continuously for 90+ days with predictable workloads. 1-year Reserved Instances provide 40% savings over On-Demand pricing.', affectedResources: 8, implementation: 'Analyze usage via Cost Explorer. Purchase convertible RIs for flexibility. Consider Savings Plans as alternative.', priority: 2, status: 'pending', tags: ['reserved-instances', 'high-impact'] },
  { id: 'rec_003', analysisId: 'ana_001', title: 'Delete 38 unattached EBS volumes', category: 'Cleanup', provider: 'aws', effort: 'Low', impact: 'Medium', annualSavings: 4560, monthlySavings: 380, description: '38 EBS volumes are unattached to any instance, accumulating storage costs with zero utilization. Safe to delete after snapshotting.', affectedResources: 38, implementation: 'Take final snapshot for each volume. Delete volumes. Set up automated policy to alert on unattached volumes > 7 days.', priority: 3, status: 'pending', tags: ['cleanup', 'quick-win', 'storage'] },
  { id: 'rec_004', analysisId: 'ana_001', title: 'Enable S3 Intelligent-Tiering on log buckets', category: 'Storage', provider: 'aws', effort: 'Low', impact: 'Medium', annualSavings: 9120, monthlySavings: 760, description: 'S3 buckets with infrequent access patterns can move to Intelligent-Tiering automatically, reducing costs by up to 68%.', affectedResources: 12, implementation: 'Enable S3 Intelligent-Tiering on buckets > 128KB average object size. Add lifecycle rules for transition.', priority: 4, status: 'pending', tags: ['storage', 'automated'] },
  { id: 'rec_005', analysisId: 'ana_001', title: 'Move dev/test workloads to Spot Instances', category: 'Pricing', provider: 'aws', effort: 'Medium', impact: 'High', annualSavings: 22800, monthlySavings: 1900, description: 'Dev and testing EC2 instances can use Spot pricing at 70-80% discount. These workloads tolerate interruption.', affectedResources: 16, implementation: 'Identify interruptible workloads. Configure Spot Fleet with On-Demand fallback. Use interruption notices for graceful shutdown.', priority: 5, status: 'pending', tags: ['spot', 'dev-test'] },
  { id: 'rec_006', analysisId: 'ana_001', title: 'Set CloudWatch log retention policies', category: 'Cleanup', provider: 'aws', effort: 'Low', impact: 'Low', annualSavings: 2520, monthlySavings: 210, description: 'CloudWatch log groups without retention policies accumulate data indefinitely. Setting 30-90 day retention reduces log storage costs significantly.', affectedResources: 47, implementation: 'Set retention policy on all log groups via AWS CLI or Console. Identify critical logs needing longer retention.', priority: 6, status: 'pending', tags: ['cleanup', 'monitoring', 'quick-win'] },
];

const mockRisks = [
  { id: 'risk_001', analysisId: 'ana_001', title: 'Single-AZ Database Deployment', severity: 'critical', category: 'Availability', description: 'Primary production database (db-primary-prod) is deployed in a single Availability Zone. A zone failure causes complete service outage.', affectedResources: ['db-primary-prod'], recommendation: 'Enable Multi-AZ deployment for RDS instance. Additional cost ~$2,100/mo but eliminates critical SLA risk.', estimatedRiskCost: 480000 },
  { id: 'risk_002', analysisId: 'ana_001', title: 'No backup policy on 4 production EC2s', severity: 'high', category: 'Data Protection', description: '4 stateful EC2 instances running production workloads have no automated backup or snapshot policy configured.', affectedResources: ['app-server-03', 'app-server-04', 'worker-01', 'worker-02'], recommendation: 'Enable AWS Backup with daily snapshots and 30-day retention. Estimated cost: $45/mo.', estimatedRiskCost: 120000 },
  { id: 'risk_003', analysisId: 'ana_001', title: 'Overly permissive IAM roles on EC2', severity: 'high', category: 'Security', description: '3 IAM roles have AdministratorAccess attached to EC2 instances that only require S3 read access. Violates principle of least privilege.', affectedResources: ['iam-role-ec2-prod-01', 'iam-role-ec2-prod-02', 'iam-role-worker'], recommendation: 'Replace AdministratorAccess with scoped policies. Use IAM Access Analyzer.', estimatedRiskCost: 0 },
  { id: 'risk_004', analysisId: 'ana_001', title: 'Unencrypted S3 buckets with PII data', severity: 'medium', category: 'Security', description: '2 S3 buckets containing customer PII data do not have server-side encryption enabled. Potential GDPR/compliance violation.', affectedResources: ['customer-data-bucket', 'user-uploads-bucket'], recommendation: 'Enable AES-256 or KMS encryption on all S3 buckets containing sensitive data.', estimatedRiskCost: 0 },
  { id: 'risk_005', analysisId: 'ana_001', title: 'CloudTrail not enabled in all regions', severity: 'medium', category: 'Compliance', description: 'AWS CloudTrail is only enabled in us-east-1. API activity in eu-west-1 and ap-southeast-1 is not being logged.', affectedResources: ['cloudtrail-prod'], recommendation: 'Enable multi-region CloudTrail trail. Route logs to centralized S3 bucket with integrity validation.', estimatedRiskCost: 0 },
];

const monthlyTrend = [
  { month: 'Jan', aws: 68200, azure: 28400, gcp: 18100 },
  { month: 'Feb', aws: 71300, azure: 29100, gcp: 18900 },
  { month: 'Mar', aws: 73800, azure: 30200, gcp: 19400 },
  { month: 'Apr', aws: 76400, azure: 31100, gcp: 20100 },
  { month: 'May', aws: 78900, azure: 29800, gcp: 20800 },
  { month: 'Jun', aws: 80200, azure: 31400, gcp: 21200 },
  { month: 'Jul', aws: 79100, azure: 32100, gcp: 21800 },
  { month: 'Aug', aws: 81400, azure: 33200, gcp: 22100 },
  { month: 'Sep', aws: 82800, azure: 32900, gcp: 21400 },
  { month: 'Oct', aws: 84000, azure: 34100, gcp: 22300 },
  { month: 'Nov', aws: 83200, azure: 33800, gcp: 21900 },
  { month: 'Dec', aws: 84320, azure: 32100, gcp: 21500 },
];

const wasteByService = [
  { service: 'EC2', waste: 8400, optimizable: 6200 },
  { service: 'S3', waste: 3200, optimizable: 2800 },
  { service: 'RDS', waste: 2100, optimizable: 1800 },
  { service: 'EBS', waste: 1800, optimizable: 1800 },
  { service: 'Network', waste: 1400, optimizable: 900 },
  { service: 'Snapshots', waste: 1000, optimizable: 900 },
  { service: 'CloudWatch', waste: 640, optimizable: 500 },
  { service: 'Lambda', waste: 400, optimizable: 300 },
];

const terraformData = {
  resourceCount: 86,
  estimatedMonthlyCost: 13386,
  estimatedYearlyCost: 160632,
  costBreakdown: [
    { resource: 'aws_instance.web_servers', count: 8, monthlyCost: 6736, type: 't3.xlarge' },
    { resource: 'aws_db_instance.primary', count: 1, monthlyCost: 2100, type: 'db.r5.large' },
    { resource: 'aws_elasticache_cluster.session', count: 1, monthlyCost: 680, type: 'cache.r6g.large' },
    { resource: 'aws_lb.application', count: 2, monthlyCost: 320, type: 'application' },
    { resource: 'aws_s3_bucket.*', count: 14, monthlyCost: 2890, type: 'Standard storage' },
    { resource: 'aws_nat_gateway.*', count: 3, monthlyCost: 450, type: 'NAT Gateway' },
    { resource: 'aws_cloudwatch_log_group.*', count: 47, monthlyCost: 210, type: 'Log storage' },
  ],
  suggestions: [
    'Replace t3.xlarge with t3.large for web_servers — CPU < 10%, save ~$3,368/mo',
    'Remove duplicate NAT gateways in same AZ — save ~$300/mo',
    'Add S3 lifecycle_rule to log buckets — save ~$400/mo',
    'Enable multi_az on RDS for production reliability',
  ],
};

module.exports = { mockAnalyses, mockResources, mockRecommendations, mockRisks, monthlyTrend, wasteByService, terraformData };
