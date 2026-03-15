using FluentValidation.Results;
using YearPlanningApp.Application.Common.Models;

namespace YearPlanningApp.API.Models;

public record Envelope<T>(bool Success, T? Data, EnvelopeError? Error, DateTime Timestamp)
{
    public static Envelope<T> Ok(T data) =>
        new(true, data, null, DateTime.UtcNow);
}

public record EnvelopeError(string Code, string Message, IEnumerable<FieldError>? Details = null);
public record FieldError(string Field, string Message);

public static class Envelope
{
    public static Envelope<T> Success<T>(T data) => Envelope<T>.Ok(data);

    public static Envelope<object?> Error(string message, string code = "ERROR") =>
        new(false, null, new EnvelopeError(code, message), DateTime.UtcNow);

    public static Envelope<object?> ValidationError(ValidationError error)
    {
        var details = error.Errors.Select(e => new FieldError(e.PropertyName, e.ErrorMessage));
        return new(false, null, new EnvelopeError("VALIDATION_ERROR", "One or more validation errors occurred.", details), DateTime.UtcNow);
    }

    public static Envelope<object?> NotFound(NotFoundError error) =>
        new(false, null, new EnvelopeError("NOT_FOUND", $"{error.EntityName} not found."), DateTime.UtcNow);

    public static Envelope<object?> Conflict(string message) =>
        new(false, null, new EnvelopeError("CONFLICT", message), DateTime.UtcNow);

    public static Envelope<object?> Unauthorized(string message) =>
        new(false, null, new EnvelopeError("UNAUTHORIZED", message), DateTime.UtcNow);
}
