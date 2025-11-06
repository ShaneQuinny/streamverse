# --- Register Routes ---
def register_blueprint_routes(blueprint, route_definitions, context_globals):
    for path, func_name, methods, wrappers in route_definitions:
        view_func = context_globals[func_name]

        # Apply wrappers (decorators) if specified # remove reverse?
        if wrappers:
            for wrapper in reversed(wrappers):
                view_func = wrapper(view_func)

        blueprint.add_url_rule(path, view_func=view_func, methods=methods)
