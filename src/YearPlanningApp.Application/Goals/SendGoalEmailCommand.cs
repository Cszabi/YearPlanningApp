using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Common.Models;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Goals;

// ── Command ───────────────────────────────────────────────────────────────────
public record SendGoalEmailCommand(Guid GoalId, int Year)
    : ICommand<OneOf<SuccessResult, NotFoundError, ConflictError>>, IAuthenticatedCommand;

// ── Handler ───────────────────────────────────────────────────────────────────
public class SendGoalEmailCommandHandler
    : ICommandHandler<SendGoalEmailCommand, OneOf<SuccessResult, NotFoundError, ConflictError>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _email;

    public SendGoalEmailCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser, IEmailService email)
    {
        _uow = uow;
        _currentUser = currentUser;
        _email = email;
    }

    public async ValueTask<OneOf<SuccessResult, NotFoundError, ConflictError>> Handle(
        SendGoalEmailCommand command, CancellationToken ct)
    {
        var goals = await _uow.Goals.GetByUserAndYearAsync(_currentUser.UserId, command.Year, ct);
        var goal  = goals.FirstOrDefault(g => g.Id == command.GoalId);
        if (goal is null)
            return new NotFoundError("Goal", command.GoalId);

        if (string.IsNullOrWhiteSpace(_currentUser.Email))
            return new ConflictError("No email address on record for this account.");

        var dto = goal.ToDto();
        var html     = GoalEmailTemplate.Build(dto, _currentUser.Email);

        try
        {
            await _email.SendAsync(
                toEmail:  _currentUser.Email,
                toName:   _currentUser.Email,
                subject:  $"Your goal: {dto.Title}",
                htmlBody: html,
                ct:       ct);
        }
        catch (Exception ex)
        {
            return new ConflictError($"Failed to send email: {ex.Message}");
        }

        return new SuccessResult();
    }
}

// ── Email template ────────────────────────────────────────────────────────────
internal static class GoalEmailTemplate
{
    private const string HeaderImageUrl =
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=260&q=80&auto=format&fit=crop";

    private const string Teal   = "#0D6E6E";
    private const string Light  = "#F7F9F9";
    private const string Border = "#D8E2E2";

    public static string Build(GoalDto goal, string recipientEmail)
    {
        var targetDate       = goal.TargetDate.HasValue ? goal.TargetDate.Value.ToString("MMMM d, yyyy") : "—";
        var progressBar      = ProgressBar(goal.ProgressPercent);
        var smartSection     = SmartSection(goal.SmartGoal);
        var woopSection      = WoopSection(goal.WoopReflection);
        var milestoneSection = MilestoneSection(goal.Milestones);

        return $"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Your Goal — {Encode(goal.Title)}</title>
        </head>
        <body style="margin:0;padding:0;background:#F0F4F4;font-family:'Helvetica Neue',Arial,sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="padding:32px 16px;">

              <table width="600" cellpadding="0" cellspacing="0" border="0"
                     style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <!-- Header image -->
                <tr>
                  <td style="padding:0;">
                    <img src="{HeaderImageUrl}" width="600" alt="Focus"
                         style="width:100%;height:200px;object-fit:cover;display:block;"/>
                  </td>
                </tr>

                <!-- Brand + title -->
                <tr>
                  <td style="padding:24px 40px 0;">
                    <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:{Teal};font-weight:600;">
                      Flowkigai · Goal Details
                    </p>
                    <h1 style="margin:0;font-size:26px;font-weight:700;color:#1A1A2E;font-family:Georgia,serif;line-height:1.25;">
                      {Encode(goal.Title)}
                    </h1>
                  </td>
                </tr>

                <!-- Meta row -->
                <tr>
                  <td style="padding:16px 40px 24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        {MetaChip(LifeAreaLabel(goal.LifeArea), "#EAF4F4", Teal)}
                        <td width="8"></td>
                        {MetaChip(goal.GoalType, "#FEF3E2", "#B8621C")}
                        <td width="8"></td>
                        {MetaChip($"Target: {targetDate}", Light, "#5A6A6A")}
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid {Border};margin:0;"/></td></tr>

                <!-- Progress -->
                <tr>
                  <td style="padding:24px 40px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#5A6A6A;text-transform:uppercase;letter-spacing:1px;">
                      Progress — {goal.ProgressPercent}%
                    </p>
                    {progressBar}
                  </td>
                </tr>

                {(goal.WhyItMatters is { Length: > 0 } why ? WhySection(why) : "")}

                {smartSection}

                {woopSection}

                {milestoneSection}

                <!-- Footer -->
                <tr>
                  <td style="padding:32px 40px;background:{Light};border-top:1px solid {Border};">
                    <p style="margin:0;font-size:12px;color:#8A9A9A;line-height:1.6;">
                      This email was sent to <strong>{Encode(recipientEmail)}</strong> because you requested it from Flowkigai.<br/>
                      Keep moving toward your North Star. 🌟
                    </p>
                  </td>
                </tr>

              </table>

            </td></tr>
          </table>

        </body>
        </html>
        """;
    }

    private static string ProgressBar(int pct) => $"""
        <div style="background:{Border};border-radius:99px;height:10px;overflow:hidden;">
          <div style="width:{pct}%;background:{Teal};height:100%;border-radius:99px;"></div>
        </div>
        """;

    private static string MetaChip(string label, string bg, string color) => $"""
        <td style="padding:4px 12px;background:{bg};border-radius:99px;font-size:12px;font-weight:600;color:{color};white-space:nowrap;">
          {Encode(label)}
        </td>
        """;

    private static string SectionTitle(string title) => $"""
        <tr><td style="padding:24px 40px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:{Teal};">
            {title}
          </p>
        </td></tr>
        """;

    private static string WhySection(string why) => $"""
        <tr><td style="padding:0 40px;">
          <hr style="border:none;border-top:1px solid {Border};margin:0 0 24px;"/>
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:{Teal};">
            Why It Matters
          </p>
          <p style="margin:0;font-size:15px;color:#2A3A3A;line-height:1.7;font-style:italic;">
            "{Encode(why)}"
          </p>
        </td></tr>
        """;

    private static string SmartSection(SmartGoalDto? s)
    {
        if (s is null) return "";
        return $"""
        {SectionTitle("SMART Goal")}
        <tr><td style="padding:8px 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border:1px solid {Border};border-radius:8px;overflow:hidden;">
            {SmartRow("S — Specific",   s.Specific)}
            {SmartRow("M — Measurable", s.Measurable)}
            {SmartRow("A — Achievable", s.Achievable)}
            {SmartRow("R — Relevant",   s.Relevant)}
            {SmartRow("T — Time-bound", s.TimeBound.ToString("MMMM d, yyyy"), last: true)}
          </table>
        </td></tr>
        """;
    }

    private static string SmartRow(string label, string value, bool last = false)
    {
        var border = last ? "none" : $"1px solid {Border}";
        return $"""
        <tr>
          <td style="padding:10px 16px;width:130px;font-size:12px;font-weight:700;color:{Teal};border-bottom:{border};">
            {Encode(label)}
          </td>
          <td style="padding:10px 16px;font-size:14px;color:#2A3A3A;line-height:1.5;border-bottom:{border};">
            {Encode(value)}
          </td>
        </tr>
        """;
    }

    private static string WoopSection(WoopReflectionDto? w)
    {
        if (w is null) return "";
        return $"""
        {SectionTitle("WOOP Reflection")}
        <tr><td style="padding:0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:{Light};border-radius:8px;border:1px solid {Border};">
            <tr>
              <td style="vertical-align:top;width:50%;padding:12px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:{Teal};">Wish</p>
                <p style="margin:0;font-size:14px;color:#2A3A3A;line-height:1.6;">{Encode(w.Wish)}</p>
              </td>
              <td style="vertical-align:top;width:50%;padding:12px;border-left:1px solid {Border};">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:{Teal};">Outcome</p>
                <p style="margin:0;font-size:14px;color:#2A3A3A;line-height:1.6;">{Encode(w.Outcome)}</p>
              </td>
            </tr>
            <tr style="border-top:1px solid {Border};">
              <td style="vertical-align:top;width:50%;padding:12px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:{Teal};">Obstacle</p>
                <p style="margin:0;font-size:14px;color:#2A3A3A;line-height:1.6;">{Encode(w.Obstacle)}</p>
              </td>
              <td style="vertical-align:top;width:50%;padding:12px;border-left:1px solid {Border};">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:{Teal};">Plan (If-Then)</p>
                <p style="margin:0;font-size:14px;color:#2A3A3A;line-height:1.6;">{Encode(w.Plan)}</p>
              </td>
            </tr>
          </table>
        </td></tr>
        """;
    }

    private static string MilestoneSection(IReadOnlyList<MilestoneDto> milestones)
    {
        if (milestones.Count == 0) return "";

        var rows = string.Join("", milestones.Select(m =>
        {
            var check   = m.IsComplete ? "✅" : "⬜";
            var tasks   = m.Tasks.Count > 0
                ? $"<p style='margin:4px 0 0;font-size:12px;color:#8A9A9A;'>{m.Tasks.Count} task{(m.Tasks.Count == 1 ? "" : "s")}</p>"
                : "";
            var dateStr = m.TargetDate.HasValue ? m.TargetDate.Value.ToString("MMM d") : "";
            return $"""
                <tr>
                  <td style="padding:10px 16px;font-size:18px;width:32px;border-bottom:1px solid {Border};">{check}</td>
                  <td style="padding:10px 16px;border-bottom:1px solid {Border};">
                    <p style="margin:0;font-size:14px;color:#1A1A2E;font-weight:600;">{Encode(m.Title)}</p>
                    {tasks}
                  </td>
                  <td style="padding:10px 16px;font-size:12px;color:#8A9A9A;white-space:nowrap;border-bottom:1px solid {Border};">{dateStr}</td>
                </tr>
                """;
        }));

        return $"""
        {SectionTitle("Milestones")}
        <tr><td style="padding:0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border:1px solid {Border};border-radius:8px;overflow:hidden;">
            {rows}
          </table>
        </td></tr>
        """;
    }

    private static string LifeAreaLabel(string lifeArea) => lifeArea switch
    {
        "CareerWork"           => "💼 Career & Work",
        "HealthBody"           => "💪 Health & Body",
        "RelationshipsFamily"  => "❤️ Relationships",
        "LearningGrowth"       => "📚 Learning & Growth",
        "Finance"              => "💰 Finance",
        "CreativityHobbies"    => "🎨 Creativity & Hobbies",
        "EnvironmentLifestyle" => "🌿 Environment & Lifestyle",
        "ContributionPurpose"  => "🌍 Contribution & Purpose",
        _                      => lifeArea
    };

    private static string Encode(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "");
}
