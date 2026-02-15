-- CreateTable
CREATE TABLE `Job` (
  `id` VARCHAR(191) NOT NULL,
  `mode` ENUM('SIMULATE', 'CSV_UPLOAD') NOT NULL,
  `status` ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
  `missionId` VARCHAR(191) NOT NULL,
  `aircraft` VARCHAR(191) NOT NULL,
  `inputFilename` VARCHAR(191) NULL,
  `inputFilePath` VARCHAR(191) NULL,
  `shouldGeneratePdf` BOOLEAN NOT NULL DEFAULT false,
  `outputDir` VARCHAR(191) NOT NULL,
  `startedAt` DATETIME(3) NULL,
  `finishedAt` DATETIME(3) NULL,
  `exitCode` INTEGER NULL,
  `log` LONGTEXT NULL,
  `error` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
  `id` VARCHAR(191) NOT NULL,
  `jobId` VARCHAR(191) NOT NULL,
  `sourceSessionId` INTEGER NOT NULL,
  `missionId` VARCHAR(191) NOT NULL,
  `aircraftType` VARCHAR(191) NOT NULL,
  `startTime` DOUBLE NOT NULL,
  `endTime` DOUBLE NOT NULL,
  `stabilityIndex` DOUBLE NOT NULL,
  `sensorReliability` DOUBLE NOT NULL,
  `missionCompliance` DOUBLE NOT NULL,
  `riskClassification` ENUM('CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Session_jobId_key`(`jobId`),
  INDEX `Session_createdAt_idx`(`createdAt`),
  INDEX `Session_riskClassification_idx`(`riskClassification`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Anomaly` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `timestamp` DOUBLE NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `paramAffected` VARCHAR(191) NULL,
  `severity` ENUM('CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION') NOT NULL,
  `details` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Anomaly_sessionId_severity_timestamp_idx`(`sessionId`, `severity`, `timestamp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Artifact` (
  `id` VARCHAR(191) NOT NULL,
  `jobId` VARCHAR(191) NOT NULL,
  `kind` ENUM('DB', 'CSV', 'HTML', 'PDF', 'INPUT') NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `relativePath` VARCHAR(191) NOT NULL,
  `sizeBytes` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Artifact_jobId_kind_fileName_key`(`jobId`, `kind`, `fileName`),
  INDEX `Artifact_jobId_kind_idx`(`jobId`, `kind`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Job_status_createdAt_idx` ON `Job`(`status`, `createdAt`);

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Anomaly` ADD CONSTRAINT `Anomaly_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Artifact` ADD CONSTRAINT `Artifact_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
