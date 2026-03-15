namespace YearPlanningApp.Application.Common.Interfaces;

/// <summary>
/// Marker interface for commands that require an authenticated user.
/// Commands that do NOT implement this (e.g. Register, Login, Refresh) bypass the authorisation check.
/// </summary>
public interface IAuthenticatedCommand { }
