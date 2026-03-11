import { AdminAnalyticsRepository } from "@/repositories/admin.analytics.repository";

export class AdminAnalyticsService {
  private repo: AdminAnalyticsRepository;

  constructor() {
    this.repo = new AdminAnalyticsRepository();
  }

  getKpis()                       { return this.repo.getKpis(); }
  getGrowthStats()                { return this.repo.getGrowthStats(); }
  getActivationSeries(days: number) { return this.repo.getActivationSeries(days); }
  getActivationFunnel()           { return this.repo.getActivationFunnel(); }
  getRetention()                  { return this.repo.getRetention(); }
  getFeatureAdoption()            { return this.repo.getFeatureAdoption(); }
  getClubMetrics()                { return this.repo.getClubMetrics(); }
}
