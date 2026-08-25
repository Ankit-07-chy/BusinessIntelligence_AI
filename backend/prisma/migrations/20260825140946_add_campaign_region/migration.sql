/*
  Warnings:

  - Added the required column `region` to the `dim_campaign` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dim_campaign" ADD COLUMN     "region" TEXT NOT NULL;
