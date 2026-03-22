/**
 * CostAnalysis entity — canonical data shape used throughout the app
 */
export const CostAnalysisSchema = {
  id: String,
  name: String,
  provider: String,   // 'aws' | 'azure' | 'gcp' | 'multi'
  status: String,     // 'running' | 'completed' | 'failed'
  createdAt: String,
  totalMonthlyCost: Number,
  wasteAmount: Number,
  wastePercentage: Number,
  savingsOpportunity: Number,
  resources: Number,
  region: String,
  account: String,
  tags: Object,
}

export const PROVIDERS = ['aws', 'azure', 'gcp']
export const REGIONS = {
  aws:   ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
  azure: ['eastus', 'westus2', 'northeurope', 'southeastasia'],
  gcp:   ['us-central1', 'us-east1', 'europe-west1', 'asia-east1'],
}
export const TASK_STATUS = ['todo', 'in_progress', 'completed']
export const PRIORITY    = ['low', 'medium', 'high']
