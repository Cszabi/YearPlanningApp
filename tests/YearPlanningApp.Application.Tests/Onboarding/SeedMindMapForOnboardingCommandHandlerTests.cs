using NSubstitute;
using OneOf;
using Shouldly;
using YearPlanningApp.Application.Onboarding;

namespace YearPlanningApp.Application.Tests.Onboarding;

public class SeedMindMapForOnboardingCommandHandlerTests
{
    private readonly IOnboardingMindMapSeedService _seedService;
    private readonly SeedMindMapForOnboardingCommandHandler _handler;

    public SeedMindMapForOnboardingCommandHandlerTests()
    {
        _seedService = Substitute.For<IOnboardingMindMapSeedService>();
        _handler = new SeedMindMapForOnboardingCommandHandler(_seedService);
    }

    [Fact]
    public async Task Handle_ShouldReturnSeedResult_WhenServiceSucceeds()
    {
        var nodes = new List<ProposedNodeDto>
        {
            new("Career", "Branch", null, null, "💼", null),
            new("Side project", "Leaf", "Career", null, null, null),
        };
        var expected = new SeedMindMapForOnboardingResult(nodes, "A map of your professional goals.");

        _seedService
            .GenerateNodesAsync(
                Arg.Any<string>(), Arg.Any<List<ConversationAnswerDto>>(),
                Arg.Any<List<string>>(), Arg.Any<CancellationToken>())
            .Returns(OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>.FromT0(expected));

        var command = new SeedMindMapForOnboardingCommand(
            "practical",
            [new ConversationAnswerDto("What matters most?", "Career growth")],
            []);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        result.AsT0.ProposedNodes.Count.ShouldBe(2);
        result.AsT0.SeedSummary.ShouldBe("A map of your professional goals.");
    }

    [Fact]
    public async Task Handle_ShouldReturnError_WhenServiceFails()
    {
        _seedService
            .GenerateNodesAsync(
                Arg.Any<string>(), Arg.Any<List<ConversationAnswerDto>>(),
                Arg.Any<List<string>>(), Arg.Any<CancellationToken>())
            .Returns(OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>.FromT1(
                new OnboardingSeedError("Anthropic API returned 429")));

        var command = new SeedMindMapForOnboardingCommand("practical", [], []);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsT1.ShouldBeTrue();
        result.AsT1.Message.ShouldBe("Anthropic API returned 429");
    }

    [Fact]
    public async Task Handle_ShouldDelegateExactArgumentsToService()
    {
        var answers = new List<ConversationAnswerDto>
        {
            new("Q1?", "Answer one"),
            new("Q2?", "Answer two"),
        };
        var existingLabels = new List<string> { "Career", "Health" };

        _seedService
            .GenerateNodesAsync(
                Arg.Any<string>(), Arg.Any<List<ConversationAnswerDto>>(),
                Arg.Any<List<string>>(), Arg.Any<CancellationToken>())
            .Returns(OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>.FromT1(
                new OnboardingSeedError("irrelevant")));

        var command = new SeedMindMapForOnboardingCommand("ikigai", answers, existingLabels);
        await _handler.Handle(command, CancellationToken.None);

        await _seedService.Received(1).GenerateNodesAsync(
            "ikigai",
            Arg.Is<List<ConversationAnswerDto>>(a => a.Count == 2 && a[0].Question == "Q1?"),
            Arg.Is<List<string>>(l => l.SequenceEqual(existingLabels)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldCallServiceExactlyOnce()
    {
        _seedService
            .GenerateNodesAsync(
                Arg.Any<string>(), Arg.Any<List<ConversationAnswerDto>>(),
                Arg.Any<List<string>>(), Arg.Any<CancellationToken>())
            .Returns(OneOf<SeedMindMapForOnboardingResult, OnboardingSeedError>.FromT1(
                new OnboardingSeedError("error")));

        await _handler.Handle(new SeedMindMapForOnboardingCommand("practical", [], []), CancellationToken.None);

        await _seedService.Received(1).GenerateNodesAsync(
            Arg.Any<string>(), Arg.Any<List<ConversationAnswerDto>>(),
            Arg.Any<List<string>>(), Arg.Any<CancellationToken>());
    }
}
