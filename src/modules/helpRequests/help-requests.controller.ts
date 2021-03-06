import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Delete,
  ParseIntPipe,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { HelpRequestsService } from './help-requests.service';
import { HelpRequest } from './help-request.entity';
import { HelpRequestCreateDto } from './dto/help-request-create.dto';
import { ReqUser } from '../../decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserID } from '../users/user.entity';
import { HelpRequestByIdPipe } from './help-request-by-id.pipe';
import { CreateOrUpdateHelpRequestArticleDto } from './dto/help-request-article-create.dto';
import { GetAllQueryParams } from './dto/get-all-query-params.dto';

@ApiBearerAuth()
@ApiTags('Help Requests')
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseInterceptors(ClassSerializerInterceptor)
@Controller('help-requests')
export class HelpRequestsController {
  private readonly logger = new Logger(HelpRequestsController.name);

  constructor(private readonly helpRequestsService: HelpRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get and filter for various help requests' })
  @ApiOkResponse({ description: 'Successful', type: [HelpRequest] })
  async getAll(
    @Query() query: GetAllQueryParams,
    @ReqUser() user: any,
  ): Promise<HelpRequest[]> {
    let userIdFilter = query.userId;
    if (query.userId === 'me') {
      userIdFilter = user.userId;
    }

    /* The generated api by openapi automatically only sends
       a string (not an array) */
    if (typeof query.status === 'string') {
      query.status = [query.status];
    }
    // same problem as with status
    if (typeof query.zipCode === 'string') {
      query.zipCode = [query.zipCode];
    }

    const requests = await this.helpRequestsService.getAll({
      userId: userIdFilter,
      excludeUserId: query.excludeUserId,
      zipCode: query.zipCode,
      includeRequester: query.includeRequester,
      status: query.status as string[],
    });
    return requests;
  }

  @Post()
  @ApiOperation({ summary: 'Add a help request' })
  @ApiCreatedResponse({
    description: 'Add a complete request including articles.',
    type: HelpRequest,
  })
  async insertRequestWithArticles(
    @Body() createHelpRequestDto: HelpRequestCreateDto,
    @ReqUser() user: UserID,
  ): Promise<HelpRequest> {
    const entity = await this.helpRequestsService.create(
      createHelpRequestDto,
      user.userId,
    );
    return entity;
  }

  @Get(':helpRequestId')
  @ApiOperation({ summary: 'Get a single help request by id' })
  @ApiOkResponse({ description: 'Successful', type: HelpRequest })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  @ApiParam({
    name: 'helpRequestId',
    description: 'Id of the help request',
    type: 'integer',
  })
  async getSingleRequest(
    @Param('helpRequestId', ParseIntPipe) helpRequestId: number,
  ): Promise<HelpRequest> {
    return await this.helpRequestsService.getById(helpRequestId);
  }

  @Put(':helpRequestId')
  @ApiOperation({ summary: 'Modify a help request (e.g. address or articles)' })
  @ApiOkResponse({ description: 'Successful', type: HelpRequest })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiNotFoundResponse({ description: 'Help request not found' })
  @ApiParam({
    name: 'helpRequestId',
    description: 'Id of the help request',
    type: 'integer',
  })
  async updateRequest(
    @Param('helpRequestId', ParseIntPipe) helpRequestId: number,
    @Body() helpRequestCreateDto: HelpRequestCreateDto,
  ): Promise<HelpRequest> {
    const entity = await this.helpRequestsService.update(
      helpRequestId,
      helpRequestCreateDto,
    );
    return entity;
  }

  @Put(':helpRequestId/article/:articleId')
  @ApiOperation({
    summary: 'Put an article to a help request, endpoint overrides.',
  })
  @ApiOkResponse({ description: 'Successful', type: HelpRequest })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiNotFoundResponse({ description: 'Help request not found' })
  @ApiParam({
    name: 'helpRequestId',
    description: 'Id of the help request',
    type: 'integer',
  })
  @ApiParam({
    name: 'articleId',
    description: 'Id of the article',
    type: 'integer',
  })
  async addArticleInHelpRequest(
    @Param('helpRequestId', HelpRequestByIdPipe) helpRequest: HelpRequest,
    @Param('articleId', ParseIntPipe) articleId: number,
    @Body() helpRequestArticleDto: CreateOrUpdateHelpRequestArticleDto,
  ): Promise<HelpRequest> {
    return this.helpRequestsService.addOrUpdateArticle(
      helpRequest,
      articleId,
      helpRequestArticleDto,
    );
  }

  @Delete(':helpRequestId/article/:articleId')
  @ApiOperation({ summary: 'Remove an article from a help request' })
  @ApiOkResponse({ description: 'Successful', type: HelpRequest })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiNotFoundResponse({ description: 'Help request not found' })
  @ApiParam({
    name: 'helpRequestId',
    description: 'Id of the help request',
    type: 'integer',
  })
  @ApiParam({
    name: 'articleId',
    description: 'Id of the article',
    type: 'integer',
  })
  async removeArticleInHelpRequest(
    @Param('helpRequestId', HelpRequestByIdPipe) helpRequest: HelpRequest,
    @Param('articleId', ParseIntPipe) articleId: number,
  ): Promise<HelpRequest> {
    return this.helpRequestsService.removeArticle(helpRequest, articleId);
  }
}
