BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AppConfig] ADD [googleClientId] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_googleClientId_df] DEFAULT '',
[loginOtpEnabled] BIT NOT NULL CONSTRAINT [AppConfig_loginOtpEnabled_df] DEFAULT 0,
[oauthEnabled] BIT NOT NULL CONSTRAINT [AppConfig_oauthEnabled_df] DEFAULT 0,
[smtpEnabled] BIT NOT NULL CONSTRAINT [AppConfig_smtpEnabled_df] DEFAULT 0,
[smtpHost] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_smtpHost_df] DEFAULT 'smtp.mailtrap.io',
[smtpPass] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_smtpPass_df] DEFAULT '',
[smtpPort] INT NOT NULL CONSTRAINT [AppConfig_smtpPort_df] DEFAULT 2525,
[smtpSender] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_smtpSender_df] DEFAULT 'noreply@forexbot.ai',
[smtpUser] NVARCHAR(1000) NOT NULL CONSTRAINT [AppConfig_smtpUser_df] DEFAULT '';

-- AlterTable
ALTER TABLE [dbo].[User] DROP CONSTRAINT [User_referralCode_df];
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_referralCode_df] DEFAULT NEWID() FOR [referralCode];
ALTER TABLE [dbo].[User] ADD [isVerified] BIT NOT NULL CONSTRAINT [User_isVerified_df] DEFAULT 0,
[otpCode] NVARCHAR(1000),
[otpExpiresAt] DATETIME2,
[resetPasswordExpiresAt] DATETIME2,
[resetPasswordToken] NVARCHAR(1000),
[roleId] NVARCHAR(1000),
[verificationToken] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Role_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Role_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[RoleMenuAccess] (
    [id] NVARCHAR(1000) NOT NULL,
    [roleId] NVARCHAR(1000) NOT NULL,
    [menuId] NVARCHAR(1000) NOT NULL,
    [canRead] BIT NOT NULL CONSTRAINT [RoleMenuAccess_canRead_df] DEFAULT 1,
    [canWrite] BIT NOT NULL CONSTRAINT [RoleMenuAccess_canWrite_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RoleMenuAccess_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RoleMenuAccess_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RoleMenuAccess_roleId_menuId_key] UNIQUE NONCLUSTERED ([roleId],[menuId])
);

-- CreateTable
CREATE TABLE [dbo].[UserMenuPermission] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [menuId] NVARCHAR(1000) NOT NULL,
    [canRead] BIT NOT NULL CONSTRAINT [UserMenuPermission_canRead_df] DEFAULT 1,
    [canWrite] BIT NOT NULL CONSTRAINT [UserMenuPermission_canWrite_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserMenuPermission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserMenuPermission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserMenuPermission_userId_menuId_key] UNIQUE NONCLUSTERED ([userId],[menuId])
);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RoleMenuAccess] ADD CONSTRAINT [RoleMenuAccess_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RoleMenuAccess] ADD CONSTRAINT [RoleMenuAccess_menuId_fkey] FOREIGN KEY ([menuId]) REFERENCES [dbo].[SystemMenu]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserMenuPermission] ADD CONSTRAINT [UserMenuPermission_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserMenuPermission] ADD CONSTRAINT [UserMenuPermission_menuId_fkey] FOREIGN KEY ([menuId]) REFERENCES [dbo].[SystemMenu]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
