import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { BackofficeService } from './backoffice.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('backoffice')
@UseGuards(JwtAuthGuard)
export class BackofficeController {
  constructor(private backofficeService: BackofficeService) {}

  @Get('kyc/queue')
  async listKycQueue() {
    return this.backofficeService.listKycQueue();
  }

  @Post('kyc/approve/:userId')
  async approveKyc(@Param('userId') userId: string) {
    return this.backofficeService.approveKyc(userId);
  }

  @Post('kyc/reject/:userId')
  async rejectKyc(@Param('userId') userId: string) {
    return this.backofficeService.rejectKyc(userId);
  }

  // Financial Queue Endpoints (Fase 15)
  @Get('financial/deposits')
  async listDepositRequests() {
    return this.backofficeService.listDepositRequests();
  }

  @Get('financial/withdrawals')
  async listWithdrawalRequests() {
    return this.backofficeService.listWithdrawalRequests();
  }

  @Post('financial/deposit/approve/:id')
  async approveDeposit(@Param('id') id: string) {
    return this.backofficeService.approveDeposit(id);
  }

  @Post('financial/deposit/reject/:id')
  async rejectDeposit(@Param('id') id: string) {
    return this.backofficeService.rejectDeposit(id);
  }

  @Post('financial/withdraw/approve/:id')
  async approveWithdrawal(@Param('id') id: string) {
    return this.backofficeService.approveWithdrawal(id);
  }

  @Post('financial/withdraw/reject/:id')
  async rejectWithdrawal(@Param('id') id: string) {
    return this.backofficeService.rejectWithdrawal(id);
  }

  @Get('mrr')
  async getMrrStats() {
    return this.backofficeService.getMrrStats();
  }

  @Get('metrics')
  async getServerMetrics() {
    return this.backofficeService.getServerMetrics();
  }

  // ─── USER & APP MANAGEMENT ENDPOINTS ────────────────────────────────────────
  @Get('users')
  async listUsers() {
    return this.backofficeService.listUsers();
  }

  @Post('users/:id/status')
  async updateUserStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.backofficeService.updateUserStatus(id, status);
  }

  @Post('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.backofficeService.updateUserRole(id, role);
  }

  @Get('config')
  async getAppConfig() {
    return this.backofficeService.getAppConfig();
  }

  @Post('config')
  async updateAppConfig(@Body() body: any) {
    return this.backofficeService.updateAppConfig(body);
  }

  // ─── SYSTEM MENU ENDPOINTS ──────────────────────────────────────────────────
  @Get('menus')
  async listSystemMenus() {
    return this.backofficeService.listSystemMenus();
  }

  @Post('menus')
  async createSystemMenu(@Body() body: any) {
    return this.backofficeService.createSystemMenu(body);
  }

  @Put('menus/:id')
  async updateSystemMenu(@Param('id') id: string, @Body() body: any) {
    return this.backofficeService.updateSystemMenu(id, body);
  }

  @Delete('menus/:id')
  async deleteSystemMenu(@Param('id') id: string) {
    return this.backofficeService.deleteSystemMenu(id);
  }

  // ─── DYNAMIC ROLES & PERMISSIONS ENDPOINTS ───────────────────────────────────
  @Get('roles')
  async listRoles() {
    return this.backofficeService.listRoles();
  }

  @Post('roles')
  async createRole(@Body() body: any) {
    return this.backofficeService.createRole(body);
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string) {
    return this.backofficeService.deleteRole(id);
  }

  @Get('roles/:roleId/menu-access')
  async getRoleMenuAccess(@Param('roleId') roleId: string) {
    return this.backofficeService.getRoleMenuAccess(roleId);
  }

  @Post('roles/:roleId/menu-access')
  async saveRoleMenuAccess(@Param('roleId') roleId: string, @Body('accesses') accesses: any[]) {
    return this.backofficeService.saveRoleMenuAccess(roleId, accesses);
  }

  @Get('users/:userId/menu-permissions')
  async getUserMenuPermissions(@Param('userId') userId: string) {
    return this.backofficeService.getUserMenuPermissions(userId);
  }

  @Post('users/:userId/menu-permissions')
  async saveUserMenuPermissions(@Param('userId') userId: string, @Body('permissions') permissions: any[]) {
    return this.backofficeService.saveUserMenuPermissions(userId, permissions);
  }

  @Get('my-authorized-menus')
  async getAuthorizedMenusForUser(@Request() req: any) {
    return this.backofficeService.getAuthorizedMenusForUser(req.user.sub);
  }
}
