namespace YearPlanningApp.Infrastructure.Settings;

public sealed class SmtpSettings
{
    public string Host     { get; init; } = "localhost";
    public int    Port     { get; init; } = 587;
    public bool   UseSsl   { get; init; } = false;
    public string UserName { get; init; } = "";
    public string Password { get; init; } = "";
    public string FromAddress { get; init; } = "noreply@flowkigai.app";
    public string FromName    { get; init; } = "Flowkigai";
}
