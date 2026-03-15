using Mediator;
using Microsoft.Extensions.Logging;
using YearPlanningApp.Application.Common.Interfaces;

namespace YearPlanningApp.Application.Common.Behaviours;

public sealed class AuthorisationBehaviour<TMessage, TResponse> : IPipelineBehavior<TMessage, TResponse>
    where TMessage : IMessage
{
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AuthorisationBehaviour<TMessage, TResponse>> _logger;

    public AuthorisationBehaviour(
        ICurrentUserService currentUserService,
        ILogger<AuthorisationBehaviour<TMessage, TResponse>> logger)
    {
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async ValueTask<TResponse> Handle(
        TMessage message,
        MessageHandlerDelegate<TMessage, TResponse> next,
        CancellationToken ct)
    {
        if (message is not IAuthenticatedCommand)
            return await next(message, ct);

        if (!_currentUserService.IsAuthenticated)
        {
            _logger.LogWarning("Unauthenticated request for {Handler}", typeof(TMessage).Name);
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return await next(message, ct);
    }
}
