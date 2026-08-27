import { 
  Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth 
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Authenticate user credentials and fetch tokens' })
  async login(@Req() req: any, @Body() dto: LoginDto) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const data = await this.authService.authenticate(req.tenant.id, dto, ip, userAgent);
    return {
      success: true,
      data,
      message: 'Login session generated successfully.',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate active JSON Web Access Token using Refresh Token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refresh(dto.refreshToken);
    return {
      success: true,
      data,
      message: 'Access token rotated successfully.',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke active refresh tokens and terminate session' })
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.id);
    return {
      success: true,
      message: 'Logged out successfully, refresh token revoked.',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Request account recovery password reset token link' })
  async forgotPassword(@Req() req: any, @Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(req.tenant.id, dto.email);
    return {
      success: true,
      data,
      message: 'Recovery links generated successfully if account exists.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Reset account password credentials using reset token' })
  async resetPassword(@Req() req: any, @Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(req.tenant.id, dto);
    return {
      success: true,
      message: 'Password reset completed successfully.',
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Verify account email activation status' })
  async verifyEmail(@Req() req: any, @Body() dto: VerifyEmailDto) {
    const data = await this.authService.verifyEmail(req.tenant.id, dto.token);
    return data;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change account password credentials' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
