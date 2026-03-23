using OneOf;

namespace YearPlanningApp.Application.Onboarding;

public interface IOnboardingMindMapSeedService
{
    Task<OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>> GenerateNodesAsync(
        string path,
        List<ConversationAnswerDto> answers,
        List<string> existingNodeLabels,
        CancellationToken ct = default);
}
