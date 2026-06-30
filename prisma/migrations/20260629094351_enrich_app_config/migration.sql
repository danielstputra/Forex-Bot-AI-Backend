BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AppConfig] ADD [appDescription] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_appDescription_df] DEFAULT 'Professional SaaS Forex Trading Bot Platform',
[appName] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_appName_df] DEFAULT 'Forex Bot AI',
[backendUrl] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_backendUrl_df] DEFAULT 'http://localhost:5000',
[defaultLanguage] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_defaultLanguage_df] DEFAULT 'ID',
[logoUrl] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_logoUrl_df] DEFAULT 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=120&h=120&q=80',
[supportEmail] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_supportEmail_df] DEFAULT 'support@forexbot.ai',
[supportTelegram] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_supportTelegram_df] DEFAULT '@forexbot_support';

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
