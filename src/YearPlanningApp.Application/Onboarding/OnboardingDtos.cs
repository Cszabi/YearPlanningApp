namespace YearPlanningApp.Application.Onboarding;

public record ConversationAnswerDto(string Question, string Answer);

public record ProposedNodeDto(
    string Label,
    string NodeType,       // "Branch" | "Leaf"
    string? ParentLabel,
    string? IkigaiCategory,
    string? Icon,
    string? Notes);

public record SeedMindMapForOnboardingResult(
    List<ProposedNodeDto> ProposedNodes,
    string SeedSummary);

public record OnboardingSeedError(string Message);
