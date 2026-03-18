using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YearPlanningApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIkigaiCategoryAndIconToMindMapNode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ikigai_category",
                table: "mind_map_nodes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "icon",
                table: "mind_map_nodes",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ikigai_category", table: "mind_map_nodes");
            migrationBuilder.DropColumn(name: "icon", table: "mind_map_nodes");
        }
    }
}
