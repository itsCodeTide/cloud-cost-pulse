export const API_BASE = import.meta.env.VITE_API_URL || ''
export const APP_NAME = 'Cloud Cost Pulse'
export const PROVIDERS = ['aws', 'azure', 'gcp']
export const REGIONS = {
  aws:   ['us-east-1','us-west-2','eu-west-1','ap-southeast-1'],
  azure: ['eastus','westus2','northeurope','southeastasia'],
  gcp:   ['us-central1','us-east1','europe-west1','asia-east1'],
}
