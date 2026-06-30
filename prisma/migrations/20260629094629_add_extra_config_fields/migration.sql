BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AppConfig] ADD [appKey] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_appKey_df] DEFAULT 'FX-BOT-AI-KEY-2026',
[appUrl] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_appUrl_df] DEFAULT 'https://app.forexbot.ai',
[appVersion] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_appVersion_df] DEFAULT 'v3.0.0';

-- AlterTable
ALTER TABLE [dbo].[User] DROP CONSTRAINT [User_referralCode_df];
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_referralCode_df] DEFAULT NEWID() FOR [referralCode];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
