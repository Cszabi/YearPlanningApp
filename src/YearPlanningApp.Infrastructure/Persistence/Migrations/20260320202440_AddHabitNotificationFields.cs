using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YearPlanningApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitNotificationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "notification_enabled",
                table: "habits",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "reminder_hour",
                table: "habits",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "notification_enabled",
                table: "habits");

            migrationBuilder.DropColumn(
                name: "reminder_hour",
                table: "habits");
        }
    }
}
