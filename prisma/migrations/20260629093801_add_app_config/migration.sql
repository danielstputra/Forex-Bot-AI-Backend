BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] DROP CONSTRAINT [User_referralCode_df];
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_referralCode_df] DEFAULT NEWID() FOR [referralCode];

-- CreateTable
CREATE TABLE [dbo].[AppConfig] (
    [id] NVARCHAR(1000) NOT NULL,
    [maintenanceMode] BIT NOT NULL CONSTRAINT [AppConfig_maintenanceMode_df] DEFAULT 0,
    [globalMinDeposit] FLOAT(53) NOT NULL CONSTRAINT [AppConfig_globalMinDeposit_df] DEFAULT 10.0,
    [globalCommissionPct] FLOAT(53) NOT NULL CONSTRAINT [AppConfig_globalCommissionPct_df] DEFAULT 0.0,
    [activeMenusJson] NVARCHAR(max) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AppConfig_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
