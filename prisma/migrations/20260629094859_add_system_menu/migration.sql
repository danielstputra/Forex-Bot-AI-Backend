BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] DROP CONSTRAINT [User_referralCode_df];
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_referralCode_df] DEFAULT NEWID() FOR [referralCode];

-- CreateTable
CREATE TABLE [dbo].[SystemMenu] (
    [id] NVARCHAR(1000) NOT NULL,
    [key] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [path] NVARCHAR(1000) NOT NULL,
    [iconName] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL CONSTRAINT [SystemMenu_order_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [SystemMenu_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SystemMenu_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SystemMenu_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SystemMenu_key_key] UNIQUE NONCLUSTERED ([key])
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
