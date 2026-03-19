using NSubstitute;
using Shouldly;
using YearPlanningApp.Application.Common.Interfaces;
using YearPlanningApp.Application.Export;
using YearPlanningApp.Domain.Entities;
using YearPlanningApp.Domain.Interfaces;

namespace YearPlanningApp.Application.Tests.Export;

public class EmailPdfCommandHandlerTests
{
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly EmailPdfCommandHandler _handler;

    public EmailPdfCommandHandlerTests()
    {
        _currentUser.UserId.Returns(_userId);
        _handler = new EmailPdfCommandHandler(_currentUser, _uow, _emailService);
    }

    [Fact]
    public async Task Handle_ShouldSendEmailWithAttachment_WhenUserExists()
    {
        var user = new User { Id = _userId, Email = "user@example.com", DisplayName = "Test User" };
        _uow.Users.GetByIdAsync(_userId, Arg.Any<CancellationToken>()).Returns(user);
        var pdfBytes = new byte[100];

        var result = await _handler.Handle(
            new EmailPdfCommand(pdfBytes, "Goals_2026.pdf", "Goals Summary 2026"),
            CancellationToken.None);

        result.IsT0.ShouldBeTrue();
        await _emailService.Received(1).SendWithAttachmentAsync(
            "user@example.com", "Test User",
            Arg.Is<string>(s => s.Contains("Goals Summary 2026")),
            Arg.Any<string>(),
            pdfBytes,
            "Goals_2026.pdf",
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ShouldReturnError_WhenUserDoesNotExist()
    {
        _uow.Users.GetByIdAsync(_userId, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await _handler.Handle(
            new EmailPdfCommand(new byte[10], "file.pdf", "Subject"),
            CancellationToken.None);

        result.IsT1.ShouldBeTrue();
    }
}
