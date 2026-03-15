using FluentValidation.Results;

namespace YearPlanningApp.Application.Common.Models;

public record ValidationError(IEnumerable<ValidationFailure> Errors);
public record NotFoundError(string EntityName, Guid Id);
public record ConflictError(string Message);
public record UnauthorizedError(string Message);
public record SuccessResult;
