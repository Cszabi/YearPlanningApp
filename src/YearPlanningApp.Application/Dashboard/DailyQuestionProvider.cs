namespace YearPlanningApp.Application.Dashboard;

public static class DailyQuestionProvider
{
    private static readonly string[] Questions =
    [
        "What would your future self thank you for today?",
        "Which of your values walked with you yesterday?",
        "What's one small thing that would make today feel lived, not survived?",
        "Where did you last feel in flow? Can you return there today?",
        "If today had only one task that mattered, which would it be?",
        "What are you protecting by staying busy?",
        "What would you do today if no one were watching?",
        "What are you avoiding that deserves your attention?",
        "Which relationship could use five quiet minutes today?",
        "What did you learn about yourself this week?",
        "Where is your energy asking you to go right now?",
        "What would it look like to do less, but better, today?",
        "What felt most alive in you this past week?",
        "What's one habit that is quietly shaping who you're becoming?",
        "If you had to teach someone one thing today, what would it be?",
        "What truth are you dancing around?",
        "What would you attempt if failure were simply data?",
        "Which of your goals still excites you? Which one feels heavy?",
        "What does rest look like for you today — not escape, but rest?",
        "Who made you feel seen recently? Have you told them?",
        "What is something you've outgrown but haven't let go of?",
        "If your North Star could speak, what would it ask of you today?",
        "What small promise can you keep to yourself before tonight?",
        "What's the kindest thing you could do for yourself this morning?",
        "Where are you placing your attention by default? Is that where you want it?",
        "What's one thing you did yesterday that aligned with your values?",
        "What would today look like if you led with curiosity instead of urgency?",
        "What boundary would make your week lighter?",
        "What is your body telling you that your mind hasn't heard yet?",
        "If you could only work on one thing for the next four hours, what would it be?",
        "What would you write in your weekly review about today?",
        "What's something you've been meaning to start? What's the smallest first step?",
        "Where have you been courageous lately, even in a small way?",
        "What would you do differently if you trusted yourself more?",
        "What does your ideal Tuesday look like? How close is this one?",
        "What's one thing you're grateful for that you usually overlook?",
        "When did you last surprise yourself? What did that feel like?",
        "What would you stop doing if you fully believed in your worth?",
        "Who do you want to be at the end of this day?",
        "What would it mean to treat today as enough?",
    ];

    public static string GetQuestion(Guid userId, DateTimeOffset today)
    {
        var dayOfYear = today.DayOfYear;
        var hash = userId.GetHashCode();
        var index = ((dayOfYear + hash) % Questions.Length + Questions.Length) % Questions.Length;
        return Questions[index];
    }
}
