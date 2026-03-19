namespace YearPlanningApp.Domain.Enums;

public enum IkigaiRoomType { Love = 1, GoodAt = 2, WorldNeeds = 3, PaidFor = 4, Synthesis = 5 }
public enum IkigaiJourneyStatus { Draft = 1, Complete = 2 }

public enum MindMapNodeType { Root = 1, Branch = 2, Leaf = 3, Goal = 4 }
public enum IkigaiCategory { Love = 1, GoodAt = 2, WorldNeeds = 3, PaidFor = 4, Intersection = 5 }

public enum GoalType { Project = 1, Repetitive = 2 }
public enum GoalStatus { Active = 1, Paused = 2, Achieved = 3, Dropped = 4 }
public enum EnergyLevel { Deep = 1, Medium = 2, Shallow = 3 }
public enum LifeArea
{
    CareerWork = 1, HealthBody = 2, RelationshipsFamily = 3,
    LearningGrowth = 4, Finance = 5, CreativityHobbies = 6,
    EnvironmentLifestyle = 7, ContributionPurpose = 8
}

public enum TaskItemStatus { NotStarted = 1, InProgress = 2, Done = 3, Deferred = 4 }

public enum HabitFrequency { Daily = 1, Weekly = 2, Monthly = 3, Custom = 4 }
public enum HabitTrackingMethod { Streak = 1, Count = 2, Duration = 3, YesNo = 4 }

public enum FlowSessionOutcome { Fully = 1, Partially = 2, NotReally = 3 }
public enum AmbientSoundMode { None = 1, BrownNoise = 2, WhiteNoise = 3, Nature = 4 }

public enum ReviewType { Weekly = 1, Monthly = 2, Quarterly = 3, Annual = 4 }

public enum UserRole { User = 0, Admin = 1 }
public enum UserPlan { Free = 0, Pro = 1 }

public enum PageExitType { Navigated = 0, Closed = 1, Idle = 2, Unknown = 3 }
