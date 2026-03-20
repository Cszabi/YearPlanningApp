using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YearPlanningApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitReminderMinute : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "reminder_minute",
                table: "habits",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "reminder_minute",
                table: "habits");
        }
    }
}
