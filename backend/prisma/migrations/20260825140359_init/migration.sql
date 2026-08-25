-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "allowed_regions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dim_product" (
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "dim_product_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "dim_store" (
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "channel_type" TEXT NOT NULL,

    CONSTRAINT "dim_store_pkey" PRIMARY KEY ("store_id")
);

-- CreateTable
CREATE TABLE "dim_campaign" (
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,

    CONSTRAINT "dim_campaign_pkey" PRIMARY KEY ("campaign_id")
);

-- CreateTable
CREATE TABLE "dim_calendar" (
    "calendar_date" DATE NOT NULL,
    "week_of_year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "is_holiday" BOOLEAN NOT NULL,

    CONSTRAINT "dim_calendar_pkey" PRIMARY KEY ("calendar_date")
);

-- CreateTable
CREATE TABLE "fact_sales" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "sale_date" DATE NOT NULL,
    "gross_revenue" DECIMAL(65,30) NOT NULL,
    "discount_amount" DECIMAL(65,30) NOT NULL,
    "returns_amount" DECIMAL(65,30) NOT NULL,
    "cost_of_goods_sold" DECIMAL(65,30) NOT NULL,
    "units_sold" INTEGER NOT NULL,

    CONSTRAINT "fact_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_inventory" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "inventory_date" DATE NOT NULL,
    "units_on_hand" INTEGER NOT NULL,
    "is_stockout" BOOLEAN NOT NULL,

    CONSTRAINT "fact_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_marketing_spend" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "spend_date" DATE NOT NULL,
    "spend_amount" DECIMAL(65,30) NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "new_customers" INTEGER NOT NULL,

    CONSTRAINT "fact_marketing_spend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_web_traffic" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "traffic_date" DATE NOT NULL,
    "sessions" INTEGER NOT NULL,
    "orders" INTEGER NOT NULL,

    CONSTRAINT "fact_web_traffic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_shipments" (
    "id" TEXT NOT NULL,
    "order_line_id" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "fulfillment_center" TEXT NOT NULL,
    "shipment_date" DATE NOT NULL,
    "delivered_on_time_in_full" BOOLEAN NOT NULL,

    CONSTRAINT "fact_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_definitions" (
    "kpi_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "business_definition" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "grain" TEXT NOT NULL,
    "refresh_cadence" TEXT NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "kpi_definitions_pkey" PRIMARY KEY ("kpi_id")
);

-- CreateTable
CREATE TABLE "source_status" (
    "source_name" TEXT NOT NULL,
    "last_successful_refresh" TIMESTAMP(3) NOT NULL,
    "completeness_score" DECIMAL(65,30) NOT NULL,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "source_status_pkey" PRIMARY KEY ("source_name")
);

-- CreateTable
CREATE TABLE "anomalies" (
    "anomaly_id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "actual_value" DECIMAL(65,30) NOT NULL,
    "forecast_value" DECIMAL(65,30) NOT NULL,
    "delta" DECIMAL(65,30) NOT NULL,
    "z_score" DECIMAL(65,30) NOT NULL,
    "materiality_score" DECIMAL(65,30) NOT NULL,
    "data_quality_score" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("anomaly_id")
);

-- CreateTable
CREATE TABLE "driver_contributions" (
    "contribution_id" TEXT NOT NULL,
    "anomaly_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "estimated_impact" DECIMAL(65,30) NOT NULL,
    "confidence_score" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "driver_contributions_pkey" PRIMARY KEY ("contribution_id")
);

-- CreateTable
CREATE TABLE "explanations" (
    "explanation_id" TEXT NOT NULL,
    "anomaly_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "narrative_text" TEXT NOT NULL,
    "evidence_citations" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "explanations_pkey" PRIMARY KEY ("explanation_id")
);

-- CreateTable
CREATE TABLE "action_recommendations" (
    "action_id" TEXT NOT NULL,
    "anomaly_id" TEXT NOT NULL,
    "action_name" TEXT NOT NULL,
    "owner_persona" TEXT NOT NULL,
    "expected_impact" DECIMAL(65,30) NOT NULL,
    "monitoring_plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "action_recommendations_pkey" PRIMARY KEY ("action_id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "feedback_id" TEXT NOT NULL,
    "insight_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "root_cause_correct" TEXT NOT NULL,
    "accepted_action" BOOLEAN NOT NULL,
    "corrected_driver" TEXT,
    "comments" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "telemetry_requests" (
    "request_id" TEXT NOT NULL,
    "user_id" TEXT,
    "persona" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "telemetry_llm_calls" (
    "llm_call_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "estimated_cost_usd" DECIMAL(65,30) NOT NULL,
    "validation_passed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_llm_calls_pkey" PRIMARY KEY ("llm_call_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "dim_product_sku_key" ON "dim_product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "fact_sales_product_id_store_id_sale_date_key" ON "fact_sales"("product_id", "store_id", "sale_date");

-- CreateIndex
CREATE UNIQUE INDEX "fact_inventory_product_id_store_id_inventory_date_key" ON "fact_inventory"("product_id", "store_id", "inventory_date");

-- CreateIndex
CREATE UNIQUE INDEX "fact_marketing_spend_campaign_id_spend_date_key" ON "fact_marketing_spend"("campaign_id", "spend_date");

-- CreateIndex
CREATE UNIQUE INDEX "fact_web_traffic_channel_device_region_traffic_date_key" ON "fact_web_traffic"("channel", "device", "region", "traffic_date");

-- AddForeignKey
ALTER TABLE "fact_sales" ADD CONSTRAINT "fact_sales_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "dim_product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_sales" ADD CONSTRAINT "fact_sales_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "dim_store"("store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_inventory" ADD CONSTRAINT "fact_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "dim_product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_inventory" ADD CONSTRAINT "fact_inventory_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "dim_store"("store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_marketing_spend" ADD CONSTRAINT "fact_marketing_spend_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "dim_campaign"("campaign_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpi_definitions"("kpi_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_contributions" ADD CONSTRAINT "driver_contributions_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "anomalies"("anomaly_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "anomalies"("anomaly_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_recommendations" ADD CONSTRAINT "action_recommendations_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "anomalies"("anomaly_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "anomalies"("anomaly_id") ON DELETE RESTRICT ON UPDATE CASCADE;
