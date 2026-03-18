using Microsoft.Extensions.Configuration;
using YearPlanningApp.Application.Common.Interfaces;

namespace YearPlanningApp.Infrastructure.Settings;

public class AppSettings : IAppSettings
{
    public string AppBaseUrl { get; }

    public AppSettings(IConfiguration configuration)
    {
        AppBaseUrl = configuration["App:BaseUrl"] ?? "http://localhost:5174";
    }
}
