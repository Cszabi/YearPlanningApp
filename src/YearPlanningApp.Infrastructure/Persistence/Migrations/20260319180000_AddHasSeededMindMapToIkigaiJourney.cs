using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YearPlanningApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHasSeededMindMapToIkigaiJourney : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "has_seeded_mind_map",
                table: "ikigai_journeys",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "has_seeded_mind_map",
                table: "ikigai_journeys");
        }
    }
}
