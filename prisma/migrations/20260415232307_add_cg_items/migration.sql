-- CreateEnum
CREATE TYPE "cg_status" AS ENUM ('DRAFT', 'READY', 'ON_AIR');

-- CreateTable
CREATE TABLE "cg_items" (
    "cgItemId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "entryId" TEXT,
    "templateName" TEXT NOT NULL DEFAULT '',
    "concept" TEXT NOT NULL DEFAULT '',
    "variant" TEXT NOT NULL DEFAULT '',
    "dataElementName" TEXT NOT NULL DEFAULT '',
    "dataElementId" TEXT,
    "fieldData" JSONB NOT NULL DEFAULT '{}',
    "mosObjId" TEXT,
    "mosObjXml" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL DEFAULT 'GFX1',
    "layer" TEXT NOT NULL DEFAULT 'FULL',
    "status" "cg_status" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cg_items_pkey" PRIMARY KEY ("cgItemId")
);

-- AddForeignKey
ALTER TABLE "cg_items" ADD CONSTRAINT "cg_items_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("storyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cg_items" ADD CONSTRAINT "cg_items_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "rundown_entries"("entryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cg_items" ADD CONSTRAINT "cg_items_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cg_items" ADD CONSTRAINT "cg_items_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
