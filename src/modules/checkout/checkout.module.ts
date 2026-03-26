import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService],
  imports: [CouponsModule],
})
export class CheckoutModule {}
