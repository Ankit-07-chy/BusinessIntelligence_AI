export interface GeneratedDimProduct {
  productId: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
}

export interface GeneratedDimStore {
  storeId: string;
  name: string;
  region: string;
  channelType: string;
}

export interface GeneratedDimCampaign {
  campaignId: string;
  name: string;
  channel: string;
  region: string;
}

export interface GeneratedDimCalendar {
  calendarDate: Date;
  weekOfYear: number;
  month: number;
  quarter: number;
  isHoliday: boolean;
}

export interface GeneratedFactSales {
  productId: string;
  storeId: string;
  saleDate: Date;
  grossRevenue: number;
  discountAmount: number;
  returnsAmount: number;
  costOfGoodsSold: number;
  unitsSold: number;
}

export interface GeneratedFactInventory {
  productId: string;
  storeId: string;
  inventoryDate: Date;
  unitsOnHand: number;
  isStockout: boolean;
}

export interface GeneratedFactMarketingSpend {
  campaignId: string;
  spendDate: Date;
  spendAmount: number;
  clicks: number;
  impressions: number;
  newCustomers: number;
}

export interface GeneratedFactWebTraffic {
  channel: string;
  device: string;
  region: string;
  trafficDate: Date;
  sessions: number;
  orders: number;
}

export interface GeneratedFactShipment {
  orderLineId: string;
  carrier: string;
  region: string;
  fulfillmentCenter: string;
  shipmentDate: Date;
  deliveredOnTimeInFull: boolean;
}

export interface GeneratedSourceStatus {
  sourceName: string;
  lastSuccessfulRefresh: Date;
  completenessScore: number;
  isActive: boolean;
}

export interface ScenarioMeta {
  startDate: string;
  endDate: string;
  incident: {
    region: string;
    startDate: string;
    endDate: string;
    stockoutProductId: string;
    stockoutSku: string;
    affectedStoreIds: string[];
    paidSearchCampaignId: string;
    competitorPromotionNote: string;
  };
  sparseHistoryProduct: {
    productId: string;
    sku: string;
    historyStartDate: string;
  };
  lowConfidence: {
    delayedCampaignId: string;
    delayedSince: string;
  };
}

export interface SyntheticDataset {
  dimProducts: GeneratedDimProduct[];
  dimStores: GeneratedDimStore[];
  dimCampaigns: GeneratedDimCampaign[];
  dimCalendar: GeneratedDimCalendar[];
  factSales: GeneratedFactSales[];
  factInventory: GeneratedFactInventory[];
  factMarketingSpend: GeneratedFactMarketingSpend[];
  factWebTraffic: GeneratedFactWebTraffic[];
  factShipments: GeneratedFactShipment[];
  sourceStatus: GeneratedSourceStatus[];
  scenario: ScenarioMeta;
}
