import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { AutoMailService } from './auto-mail.service';

/** Email for the whole app: MailService (SMTP) and AutoMailService (automatic customer emails). */
@Global()
@Module({
  providers: [MailService, AutoMailService],
  exports: [MailService, AutoMailService],
})
export class MailModule {}
