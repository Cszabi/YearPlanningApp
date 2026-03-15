using System.Diagnostics;
using Mediator;
using Microsoft.Extensions.Logging;

namespace YearPlanningApp.Application.Common.Behaviours;

public sealed class LoggingBehaviour<TMessage, TResponse> : IPipelineBehavior<TMessage, TResponse>
    where TMessage : IMessage
{
    private readonly ILogger<LoggingBehaviour<TMessage, TResponse>> _logger;

    public LoggingBehaviour(ILogger<LoggingBehaviour<TMessage, TResponse>> logger)
    {
        _logger = logger;
    }

    public async ValueTask<TResponse> Handle(
        TMessage message,
        MessageHandlerDelegate<TMessage, TResponse> next,
        CancellationToken ct)
    {
        var handlerName = typeof(TMessage).Name;
        var sw = Stopwatch.StartNew();

        try
        {
            var response = await next(message, ct);
            sw.Stop();
            _logger.LogInformation("Handler {Handler} completed in {ElapsedMs}ms", handlerName, sw.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Handler {Handler} failed after {ElapsedMs}ms", handlerName, sw.ElapsedMilliseconds);
            throw;
        }
    }
}
