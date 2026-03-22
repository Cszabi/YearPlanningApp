using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YearPlanningApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOnboardingStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "onboarding_completed_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "onboarding_status",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 3);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "onboarding_completed_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "onboarding_status",
                table: "users");
        }
    }
}
