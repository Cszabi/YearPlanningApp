using Mediator;
using OneOf;
using YearPlanningApp.Application.Common.Interfaces;

namespace YearPlanningApp.Application.Onboarding;

public record SeedMindMapForOnboardingCommand(
    string Path,
    List<ConversationAnswerDto> Answers,
    List<string> ExistingNodeLabels)
    : ICommand<OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>>, IAuthenticatedCommand;

public class SeedMindMapForOnboardingCommandHandler
    : ICommandHandler<SeedMindMapForOnboardingCommand, OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>>
{
    private readonly IOnboardingMindMapSeedService _seedService;

    public SeedMindMapForOnboardingCommandHandler(IOnboardingMindMapSeedService seedService)
    {
        _seedService = seedService;
    }

    public async ValueTask<OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>> Handle(
        SeedMindMapForOnboardingCommand command, CancellationToken ct)
    {
        return await _seedService.GenerateNodesAsync(command.Path, command.Answers, command.ExistingNodeLabels, ct);
    }
}
