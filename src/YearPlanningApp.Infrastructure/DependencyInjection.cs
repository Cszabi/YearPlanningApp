using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Ikigai;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;
using YearPlanningApp.Infrastructure.Jobs;
using YearPlanningApp.Infrastructure.Persistence;
using YearPlanningApp.Infrastructure.Services;
using YearPlanningApp.Infrastructure.Settings;

namespace YearPlanningApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

        services.AddSingleton<IAppSettings>(_ => new AppSettings(configuration));

        services.Configure<SmtpSettings>(configuration.GetSection("Smtp"));
        services.AddTransient<IEmailService, SmtpEmailService>();

        services.Configure<VapidSettings>(configuration.GetSection("Vapid"));
        services.AddScoped<IPushNotificationService, PushNotificationService>();

        services.Configure<AnthropicSettings>(configuration.GetSection("Anthropic"));
        services.AddHttpClient("anthropic", c =>
        {
            c.BaseAddress = new Uri("https://api.anthropic.com");
            c.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
        });
        services.AddScoped<IIkigaiThemeExtractionService, IkigaiThemeExtractionService>();

        services.Configure<OpenverseSettings>(configuration.GetSection("Openverse"));
        services.AddMemoryCache();
        services.AddSingleton<IFocusMusicService, OpenverseMusicService>();

        // Hangfire with Postgres storage
        services.AddHangfire(cfg => cfg
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(c =>
                c.UseNpgsqlConnection(configuration.GetConnectionString("DefaultConnection"))));
        services.AddHangfireServer(options =>
        {
            options.WorkerCount = 2;
            options.Queues = ["default"];
        });

        services.AddScoped<WeeklyReviewReminderJob>();
        services.AddScoped<GoalDeadlineReminderJob>();
        services.AddScoped<HabitStreakRiskJob>();
        services.AddScoped<HabitReminderJob>();
        services.AddScoped<AnalyticsFlushJob>();

        // Redis connection (optional — analytics buffer falls back to direct DB writes if unavailable)
        var redisConnStr = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConnStr))
        {
            try
            {
                var multiplexer = ConnectionMultiplexer.Connect(redisConnStr);
                services.AddSingleton<IConnectionMultiplexer>(multiplexer);
            }
            catch
            {
                services.AddSingleton<IConnectionMultiplexer?>(_ => null!);
            }
        }
        else
        {
            services.AddSingleton<IConnectionMultiplexer?>(_ => null!);
        }
        services.AddSingleton<IAnalyticsBuffer, AnalyticsBufferService>();

        return services;
    }
}
