BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Tenant] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [domain] NVARCHAR(1000) NOT NULL,
    [logoUrl] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Tenant_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Tenant_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Tenant_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Tenant_domain_key] UNIQUE NONCLUSTERED ([domain])
);

-- CreateTable
CREATE TABLE [dbo].[TenantTheme] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000) NOT NULL,
    [primaryColor] NVARCHAR(1000) NOT NULL CONSTRAINT [TenantTheme_primaryColor_df] DEFAULT '#06b6d4',
    [secondaryColor] NVARCHAR(1000) NOT NULL CONSTRAINT [TenantTheme_secondaryColor_df] DEFAULT '#7c3aed',
    [fontFamily] NVARCHAR(1000) NOT NULL CONSTRAINT [TenantTheme_fontFamily_df] DEFAULT 'Inter',
    [customCss] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TenantTheme_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TenantTheme_tenantId_key] UNIQUE NONCLUSTERED ([tenantId])
);

-- CreateTable
CREATE TABLE [dbo].[TenantSubscription] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000) NOT NULL,
    [planName] NVARCHAR(1000) NOT NULL,
    [price] FLOAT(53) NOT NULL,
    [validUntil] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [TenantSubscription_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TenantSubscription_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TenantSubscription_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000),
    [legalName] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000),
    [country] NVARCHAR(1000),
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [User_currency_df] DEFAULT 'USD',
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'USER',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [User_status_df] DEFAULT 'ACTIVE',
    [twoFactorOn] BIT NOT NULL CONSTRAINT [User_twoFactorOn_df] DEFAULT 0,
    [twoFactorSecret] NVARCHAR(1000),
    [kycStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [User_kycStatus_df] DEFAULT 'NOT_SUBMITTED',
    [kycDocumentUrl] NVARCHAR(1000),
    [telegramChatId] NVARCHAR(1000),
    [referralCode] NVARCHAR(1000) NOT NULL CONSTRAINT [User_referralCode_df] DEFAULT NEWID(),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [User_referralCode_key] UNIQUE NONCLUSTERED ([referralCode])
);

-- CreateTable
CREATE TABLE [dbo].[UserSession] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [ipAddress] NVARCHAR(1000) NOT NULL,
    [deviceAgent] NVARCHAR(1000) NOT NULL,
    [location] NVARCHAR(1000),
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserSession_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserSession_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[LoginAttempt] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [ipAddress] NVARCHAR(1000) NOT NULL,
    [userAgent] NVARCHAR(1000) NOT NULL,
    [success] BIT NOT NULL,
    [attemptedAt] DATETIME2 NOT NULL CONSTRAINT [LoginAttempt_attemptedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoginAttempt_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [ipAddress] NVARCHAR(1000) NOT NULL,
    [details] NVARCHAR(max),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [AuditLog_status_df] DEFAULT 'SUCCESS',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[KycDocument] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [documentType] NVARCHAR(1000) NOT NULL,
    [documentNumber] NVARCHAR(1000) NOT NULL,
    [fileUrl] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [KycDocument_status_df] DEFAULT 'PENDING',
    [rejectionReason] NVARCHAR(1000),
    [verifiedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [KycDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [KycDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BrokerAccount] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [brokerName] NVARCHAR(1000) NOT NULL,
    [accountNumber] NVARCHAR(1000) NOT NULL,
    [passwordCipher] NVARCHAR(1000) NOT NULL,
    [serverAddress] NVARCHAR(1000) NOT NULL,
    [leverage] INT NOT NULL CONSTRAINT [BrokerAccount_leverage_df] DEFAULT 500,
    [balance] FLOAT(53) NOT NULL CONSTRAINT [BrokerAccount_balance_df] DEFAULT 0.0,
    [equity] FLOAT(53) NOT NULL CONSTRAINT [BrokerAccount_equity_df] DEFAULT 0.0,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [BrokerAccount_status_df] DEFAULT 'DISCONNECTED',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BrokerAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BrokerAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BrokerAccount_accountNumber_key] UNIQUE NONCLUSTERED ([accountNumber])
);

-- CreateTable
CREATE TABLE [dbo].[BrokerSyncLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [brokerAccountId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [errorMessage] NVARCHAR(1000),
    [syncedAt] DATETIME2 NOT NULL CONSTRAINT [BrokerSyncLog_syncedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BrokerSyncLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserWallet] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [UserWallet_currency_df] DEFAULT 'USD',
    [balance] FLOAT(53) NOT NULL CONSTRAINT [UserWallet_balance_df] DEFAULT 0.0,
    [address] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [UserWallet_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserWallet_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserWallet_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DepositRequest] (
    [id] NVARCHAR(1000) NOT NULL,
    [walletId] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [paymentMethod] NVARCHAR(1000) NOT NULL,
    [proofUrl] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [DepositRequest_status_df] DEFAULT 'PENDING',
    [txHash] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DepositRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DepositRequest_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WithdrawalRequest] (
    [id] NVARCHAR(1000) NOT NULL,
    [walletId] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [paymentMethod] NVARCHAR(1000) NOT NULL,
    [payoutDetails] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [WithdrawalRequest_status_df] DEFAULT 'PENDING',
    [txHash] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WithdrawalRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WithdrawalRequest_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VpsInstance] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [ipAddress] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [VpsInstance_status_df] DEFAULT 'PROVISIONING',
    [planName] NVARCHAR(1000) NOT NULL,
    [region] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VpsInstance_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VpsInstance_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SubscriptionPlan] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [priceMonthly] FLOAT(53) NOT NULL,
    [priceYearly] FLOAT(53) NOT NULL,
    [tier] NVARCHAR(1000) NOT NULL,
    [featuresJson] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SubscriptionPlan_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SubscriptionPlan_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SubscriptionPlan_tier_key] UNIQUE NONCLUSTERED ([tier])
);

-- CreateTable
CREATE TABLE [dbo].[Subscription] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [planId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Subscription_status_df] DEFAULT 'ACTIVE',
    [validUntil] DATETIME2 NOT NULL,
    [stripeCustomerId] NVARCHAR(1000),
    [stripeSubscriptionId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Subscription_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Subscription_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Subscription_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[Transaction] (
    [id] NVARCHAR(1000) NOT NULL,
    [subscriptionId] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [Transaction_currency_df] DEFAULT 'USD',
    [paymentGateway] NVARCHAR(1000) NOT NULL,
    [gatewayRef] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Transaction_status_df] DEFAULT 'PENDING',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Transaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Transaction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Invoice] (
    [id] NVARCHAR(1000) NOT NULL,
    [subscriptionId] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Invoice_status_df] DEFAULT 'UNPAID',
    [pdfUrl] NVARCHAR(1000),
    [dueDate] DATETIME2 NOT NULL,
    [paidAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Invoice_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Invoice_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Referral] (
    [id] NVARCHAR(1000) NOT NULL,
    [referrerId] NVARCHAR(1000) NOT NULL,
    [referredId] NVARCHAR(1000) NOT NULL,
    [commissionEarned] FLOAT(53) NOT NULL CONSTRAINT [Referral_commissionEarned_df] DEFAULT 0.0,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Referral_status_df] DEFAULT 'PENDING',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Referral_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Referral_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Referral_referredId_key] UNIQUE NONCLUSTERED ([referredId])
);

-- CreateTable
CREATE TABLE [dbo].[AffiliatePayout] (
    [id] NVARCHAR(1000) NOT NULL,
    [affiliateId] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [paymentMethod] NVARCHAR(1000) NOT NULL,
    [payoutDetails] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [AffiliatePayout_status_df] DEFAULT 'PENDING',
    [paidAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AffiliatePayout_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AffiliatePayout_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PammPool] (
    [id] NVARCHAR(1000) NOT NULL,
    [managerId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [minInvestment] FLOAT(53) NOT NULL CONSTRAINT [PammPool_minInvestment_df] DEFAULT 1000.0,
    [performanceFeePct] FLOAT(53) NOT NULL CONSTRAINT [PammPool_performanceFeePct_df] DEFAULT 20.0,
    [totalAum] FLOAT(53) NOT NULL CONSTRAINT [PammPool_totalAum_df] DEFAULT 0.0,
    [allTimeRoi] FLOAT(53) NOT NULL CONSTRAINT [PammPool_allTimeRoi_df] DEFAULT 0.0,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [PammPool_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PammPool_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PammPool_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PammInvestor] (
    [id] NVARCHAR(1000) NOT NULL,
    [poolId] NVARCHAR(1000) NOT NULL,
    [investorId] NVARCHAR(1000) NOT NULL,
    [allocatedCapital] FLOAT(53) NOT NULL,
    [sharePercentage] FLOAT(53) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [PammInvestor_status_df] DEFAULT 'ACTIVE',
    [joinedAt] DATETIME2 NOT NULL CONSTRAINT [PammInvestor_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PammInvestor_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PammAllocationLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [poolId] NVARCHAR(1000) NOT NULL,
    [tradeRecordId] NVARCHAR(1000) NOT NULL,
    [investorId] NVARCHAR(1000) NOT NULL,
    [allocatedLot] FLOAT(53) NOT NULL,
    [profitShare] FLOAT(53) NOT NULL,
    [allocatedAt] DATETIME2 NOT NULL CONSTRAINT [PammAllocationLog_allocatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PammAllocationLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BotConfig] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000),
    [strategyName] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [BotConfig_isActive_df] DEFAULT 0,
    [riskTolerance] FLOAT(53) NOT NULL CONSTRAINT [BotConfig_riskTolerance_df] DEFAULT 2.0,
    [lotMultiplier] FLOAT(53) NOT NULL CONSTRAINT [BotConfig_lotMultiplier_df] DEFAULT 1.0,
    [maxDrawdown] FLOAT(53) NOT NULL CONSTRAINT [BotConfig_maxDrawdown_df] DEFAULT 20.0,
    [takeProfitPips] FLOAT(53) NOT NULL CONSTRAINT [BotConfig_takeProfitPips_df] DEFAULT 50.0,
    [stopLossPips] FLOAT(53) NOT NULL CONSTRAINT [BotConfig_stopLossPips_df] DEFAULT 30.0,
    [maCrossover] NVARCHAR(1000) NOT NULL CONSTRAINT [BotConfig_maCrossover_df] DEFAULT 'EMA 20/50',
    [rsiFilter] BIT NOT NULL CONSTRAINT [BotConfig_rsiFilter_df] DEFAULT 1,
    [volatilityStop] BIT NOT NULL CONSTRAINT [BotConfig_volatilityStop_df] DEFAULT 1,
    [riskPercentage] FLOAT(53) NOT NULL CONSTRAINT [BotConfig_riskPercentage_df] DEFAULT 2.0,
    [riskRewardRatio] FLOAT(53) NOT NULL CONSTRAINT [BotConfig_riskRewardRatio_df] DEFAULT 2.0,
    [newsFilterOn] BIT NOT NULL CONSTRAINT [BotConfig_newsFilterOn_df] DEFAULT 1,
    [useSentiment] BIT NOT NULL CONSTRAINT [BotConfig_useSentiment_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BotConfig_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BotConfig_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[StrategyLicense] (
    [id] NVARCHAR(1000) NOT NULL,
    [botConfigId] NVARCHAR(1000) NOT NULL,
    [licenseKeyHash] NVARCHAR(1000) NOT NULL,
    [ipBound] NVARCHAR(1000),
    [expiresAt] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [StrategyLicense_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [StrategyLicense_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [StrategyLicense_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [StrategyLicense_licenseKeyHash_key] UNIQUE NONCLUSTERED ([licenseKeyHash])
);

-- CreateTable
CREATE TABLE [dbo].[TradeRecord] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000),
    [pammPoolId] NVARCHAR(1000),
    [ticketId] NVARCHAR(1000),
    [magicNumber] INT,
    [currencyPair] NVARCHAR(1000) NOT NULL,
    [tradeType] NVARCHAR(1000) NOT NULL,
    [lotSize] FLOAT(53) NOT NULL,
    [entryPrice] FLOAT(53) NOT NULL,
    [closePrice] FLOAT(53),
    [profitPips] FLOAT(53),
    [profitAmount] FLOAT(53),
    [swap] FLOAT(53) NOT NULL CONSTRAINT [TradeRecord_swap_df] DEFAULT 0.0,
    [commission] FLOAT(53) NOT NULL CONSTRAINT [TradeRecord_commission_df] DEFAULT 0.0,
    [comment] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [TradeRecord_status_df] DEFAULT 'OPEN',
    [spbEstate] FLOAT(53),
    [executedAt] DATETIME2 NOT NULL CONSTRAINT [TradeRecord_executedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [closedAt] DATETIME2,
    CONSTRAINT [TradeRecord_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OrderExecutionLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [tradeRecordId] NVARCHAR(1000) NOT NULL,
    [actionType] NVARCHAR(1000) NOT NULL,
    [rawPayload] NVARCHAR(max),
    [loggedAt] DATETIME2 NOT NULL CONSTRAINT [OrderExecutionLog_loggedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OrderExecutionLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CopyBotConnection] (
    [id] NVARCHAR(1000) NOT NULL,
    [followerId] NVARCHAR(1000) NOT NULL,
    [leaderId] NVARCHAR(1000) NOT NULL,
    [multiplier] FLOAT(53) NOT NULL CONSTRAINT [CopyBotConnection_multiplier_df] DEFAULT 1.0,
    [maxLossLimit] FLOAT(53),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [CopyBotConnection_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CopyBotConnection_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CopyBotConnection_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LeaderPerformance] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [monthlyRoi] FLOAT(53) NOT NULL CONSTRAINT [LeaderPerformance_monthlyRoi_df] DEFAULT 0.0,
    [winRate] FLOAT(53) NOT NULL CONSTRAINT [LeaderPerformance_winRate_df] DEFAULT 0.0,
    [totalFollowers] INT NOT NULL CONSTRAINT [LeaderPerformance_totalFollowers_df] DEFAULT 0,
    [totalAum] FLOAT(53) NOT NULL CONSTRAINT [LeaderPerformance_totalAum_df] DEFAULT 0.0,
    [ranking] INT NOT NULL CONSTRAINT [LeaderPerformance_ranking_df] DEFAULT 999,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [LeaderPerformance_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [LeaderPerformance_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[CopyTradeExecution] (
    [id] NVARCHAR(1000) NOT NULL,
    [parentTradeId] NVARCHAR(1000) NOT NULL,
    [followerId] NVARCHAR(1000) NOT NULL,
    [allocatedLot] FLOAT(53) NOT NULL,
    [profitAmount] FLOAT(53),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [CopyTradeExecution_status_df] DEFAULT 'OPEN',
    [executedAt] DATETIME2 NOT NULL CONSTRAINT [CopyTradeExecution_executedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CopyTradeExecution_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PriceAlert] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [symbol] NVARCHAR(1000) NOT NULL,
    [targetPrice] FLOAT(53) NOT NULL,
    [condition] NVARCHAR(1000) NOT NULL,
    [isTriggered] BIT NOT NULL CONSTRAINT [PriceAlert_isTriggered_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PriceAlert_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PriceAlert_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BacktestHistory] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [strategyName] NVARCHAR(1000) NOT NULL,
    [paramsJson] NVARCHAR(1000) NOT NULL,
    [resultJson] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BacktestHistory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BacktestHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserMessage] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [isRead] BIT NOT NULL CONSTRAINT [UserMessage_isRead_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserMessage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SupportTicket] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [SupportTicket_category_df] DEFAULT 'GENERAL',
    [description] NVARCHAR(1000) NOT NULL,
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [SupportTicket_priority_df] DEFAULT 'MEDIUM',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [SupportTicket_status_df] DEFAULT 'OPEN',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupportTicket_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SupportTicket_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TicketMessage] (
    [id] NVARCHAR(1000) NOT NULL,
    [ticketId] NVARCHAR(1000) NOT NULL,
    [senderId] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TicketMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TicketMessage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[KnowledgeBaseArticle] (
    [id] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [views] INT NOT NULL CONSTRAINT [KnowledgeBaseArticle_views_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [KnowledgeBaseArticle_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [KnowledgeBaseArticle_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ApiKey] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [keyHash] NVARCHAR(1000) NOT NULL,
    [permissions] NVARCHAR(1000) NOT NULL,
    [isRevoked] BIT NOT NULL CONSTRAINT [ApiKey_isRevoked_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApiKey_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ApiKey_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ApiKey_keyHash_key] UNIQUE NONCLUSTERED ([keyHash])
);

-- CreateTable
CREATE TABLE [dbo].[Badge] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [iconName] NVARCHAR(1000) NOT NULL,
    [requiredVol] FLOAT(53) NOT NULL,
    CONSTRAINT [Badge_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserBadge] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [badgeId] NVARCHAR(1000) NOT NULL,
    [unlockedAt] DATETIME2 NOT NULL CONSTRAINT [UserBadge_unlockedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserBadge_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VolumePoint] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [month] NVARCHAR(1000) NOT NULL,
    [volumeTraded] FLOAT(53) NOT NULL,
    [pointsEarned] INT NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VolumePoint_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LoyaltyRewardClaim] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [rewardName] NVARCHAR(1000) NOT NULL,
    [pointsSpent] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [LoyaltyRewardClaim_status_df] DEFAULT 'APPROVED',
    [claimedAt] DATETIME2 NOT NULL CONSTRAINT [LoyaltyRewardClaim_claimedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoyaltyRewardClaim_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MarketSymbol] (
    [id] NVARCHAR(1000) NOT NULL,
    [symbol] NVARCHAR(1000) NOT NULL,
    [baseCurrency] NVARCHAR(1000) NOT NULL,
    [quoteCurrency] NVARCHAR(1000) NOT NULL,
    [pipSize] FLOAT(53) NOT NULL CONSTRAINT [MarketSymbol_pipSize_df] DEFAULT 0.0001,
    [digits] INT NOT NULL CONSTRAINT [MarketSymbol_digits_df] DEFAULT 5,
    [isActive] BIT NOT NULL CONSTRAINT [MarketSymbol_isActive_df] DEFAULT 1,
    CONSTRAINT [MarketSymbol_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MarketSymbol_symbol_key] UNIQUE NONCLUSTERED ([symbol])
);

-- CreateTable
CREATE TABLE [dbo].[EconomicEvent] (
    [id] NVARCHAR(1000) NOT NULL,
    [time] NVARCHAR(1000) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL,
    [event] NVARCHAR(1000) NOT NULL,
    [impact] NVARCHAR(1000) NOT NULL,
    [previous] NVARCHAR(1000),
    [forecast] NVARCHAR(1000),
    [actual] NVARCHAR(1000),
    [eventDate] DATETIME2 NOT NULL,
    CONSTRAINT [EconomicEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NewsSentiment] (
    [id] NVARCHAR(1000) NOT NULL,
    [currencyPair] NVARCHAR(1000) NOT NULL,
    [sentimentScore] FLOAT(53) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [keywords] NVARCHAR(1000),
    [analyzedAt] DATETIME2 NOT NULL CONSTRAINT [NewsSentiment_analyzedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NewsSentiment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[TenantTheme] ADD CONSTRAINT [TenantTheme_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TenantSubscription] ADD CONSTRAINT [TenantSubscription_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserSession] ADD CONSTRAINT [UserSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LoginAttempt] ADD CONSTRAINT [LoginAttempt_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[KycDocument] ADD CONSTRAINT [KycDocument_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BrokerAccount] ADD CONSTRAINT [BrokerAccount_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BrokerSyncLog] ADD CONSTRAINT [BrokerSyncLog_brokerAccountId_fkey] FOREIGN KEY ([brokerAccountId]) REFERENCES [dbo].[BrokerAccount]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserWallet] ADD CONSTRAINT [UserWallet_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DepositRequest] ADD CONSTRAINT [DepositRequest_walletId_fkey] FOREIGN KEY ([walletId]) REFERENCES [dbo].[UserWallet]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WithdrawalRequest] ADD CONSTRAINT [WithdrawalRequest_walletId_fkey] FOREIGN KEY ([walletId]) REFERENCES [dbo].[UserWallet]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VpsInstance] ADD CONSTRAINT [VpsInstance_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Subscription] ADD CONSTRAINT [Subscription_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Subscription] ADD CONSTRAINT [Subscription_planId_fkey] FOREIGN KEY ([planId]) REFERENCES [dbo].[SubscriptionPlan]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [Transaction_subscriptionId_fkey] FOREIGN KEY ([subscriptionId]) REFERENCES [dbo].[Subscription]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_subscriptionId_fkey] FOREIGN KEY ([subscriptionId]) REFERENCES [dbo].[Subscription]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Referral] ADD CONSTRAINT [Referral_referrerId_fkey] FOREIGN KEY ([referrerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Referral] ADD CONSTRAINT [Referral_referredId_fkey] FOREIGN KEY ([referredId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AffiliatePayout] ADD CONSTRAINT [AffiliatePayout_affiliateId_fkey] FOREIGN KEY ([affiliateId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PammPool] ADD CONSTRAINT [PammPool_managerId_fkey] FOREIGN KEY ([managerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PammInvestor] ADD CONSTRAINT [PammInvestor_poolId_fkey] FOREIGN KEY ([poolId]) REFERENCES [dbo].[PammPool]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PammInvestor] ADD CONSTRAINT [PammInvestor_investorId_fkey] FOREIGN KEY ([investorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PammAllocationLog] ADD CONSTRAINT [PammAllocationLog_poolId_fkey] FOREIGN KEY ([poolId]) REFERENCES [dbo].[PammPool]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BotConfig] ADD CONSTRAINT [BotConfig_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BotConfig] ADD CONSTRAINT [BotConfig_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StrategyLicense] ADD CONSTRAINT [StrategyLicense_botConfigId_fkey] FOREIGN KEY ([botConfigId]) REFERENCES [dbo].[BotConfig]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TradeRecord] ADD CONSTRAINT [TradeRecord_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TradeRecord] ADD CONSTRAINT [TradeRecord_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TradeRecord] ADD CONSTRAINT [TradeRecord_pammPoolId_fkey] FOREIGN KEY ([pammPoolId]) REFERENCES [dbo].[PammPool]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderExecutionLog] ADD CONSTRAINT [OrderExecutionLog_tradeRecordId_fkey] FOREIGN KEY ([tradeRecordId]) REFERENCES [dbo].[TradeRecord]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CopyBotConnection] ADD CONSTRAINT [CopyBotConnection_followerId_fkey] FOREIGN KEY ([followerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CopyBotConnection] ADD CONSTRAINT [CopyBotConnection_leaderId_fkey] FOREIGN KEY ([leaderId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LeaderPerformance] ADD CONSTRAINT [LeaderPerformance_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CopyTradeExecution] ADD CONSTRAINT [CopyTradeExecution_parentTradeId_fkey] FOREIGN KEY ([parentTradeId]) REFERENCES [dbo].[TradeRecord]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PriceAlert] ADD CONSTRAINT [PriceAlert_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BacktestHistory] ADD CONSTRAINT [BacktestHistory_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserMessage] ADD CONSTRAINT [UserMessage_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SupportTicket] ADD CONSTRAINT [SupportTicket_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TicketMessage] ADD CONSTRAINT [TicketMessage_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[SupportTicket]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TicketMessage] ADD CONSTRAINT [TicketMessage_senderId_fkey] FOREIGN KEY ([senderId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApiKey] ADD CONSTRAINT [ApiKey_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserBadge] ADD CONSTRAINT [UserBadge_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserBadge] ADD CONSTRAINT [UserBadge_badgeId_fkey] FOREIGN KEY ([badgeId]) REFERENCES [dbo].[Badge]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VolumePoint] ADD CONSTRAINT [VolumePoint_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LoyaltyRewardClaim] ADD CONSTRAINT [LoyaltyRewardClaim_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
