import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  actorOf,
  AuthUser,
  CurrentUser,
  StaffOnly,
} from '../common/decorators';
import {
  ATTACHMENT_MAX_BYTES,
  AttachmentsService,
  UploadedFileData,
} from './attachments.service';

@StaffOnly()
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get('attachments')
  findAll(@CurrentUser() user: AuthUser) {
    return this.attachmentsService.findAll(user.clinicId!);
  }

  // multipart/form-data con los campos `file` y `category`
  @Post('medical-events/:id/attachments')
  @UseInterceptors(
    // Margen sobre el máximo para responder 413 con mensaje propio
    FileInterceptor('file', { limits: { fileSize: ATTACHMENT_MAX_BYTES + 1 } }),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileData | undefined,
    @Body('category') category: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachmentsService.upload(id, file, category, actorOf(user));
  }

  @Get('attachments/:id/file')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { attachment, buffer } = await this.attachmentsService.read(
      id,
      user.clinicId!,
    );
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
    );
    res.send(buffer);
  }
}
